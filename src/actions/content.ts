'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { commitFileToRepo } from '@/lib/github';

type PostData = {
  title: string;
  slug: string;
  mainImage: string;
  content: string;
  createdAt: number;
};

const FREE_USER_POST_LIMIT = 15;

// Helper function to get the current user's UID from the session cookie
async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated');
    }
    try {
        // Changed checkRevoked from true to false to prevent issues with session sync timing.
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        throw new Error('Session expired or invalid. Please log in again.');
    }
}

// Get the user-specific collection reference
function getUserCollection(userId: string, collectionName: string) {
    if (!adminDb) throw new Error('Firebase Admin not initialized');
    return adminDb.collection('users').doc(userId).collection(collectionName);
}

// Get the user-specific document reference
function getUserDoc(userId: string, collectionName: string, docId: string) {
    return getUserCollection(userId, collectionName).doc(docId);
}

// Upload an image if it's a data URI, then return the URL
async function uploadImageIfNeeded(dataUriOrUrl: string, slug: string): Promise<string> {
    if (!dataUriOrUrl || !dataUriOrUrl.startsWith('data:image')) {
        return dataUriOrUrl; // It's already a URL, so no upload needed
    }
    
    const base64Content = dataUriOrUrl.split(',')[1];
    const mimeType = dataUriOrUrl.match(/data:(.*);/)?.[1] ?? 'image/png';
    const extension = mimeType.split('/')[1] ?? 'png';
    const fileName = `${slug}.${extension}`;
    
    const result = await uploadImageToRepo(base64Content, fileName);
    if (!result.success || !result.url) {
        throw new Error(result.error || 'Image upload failed during save.');
    }
    
    return result.url;
}


// Save content to a user's subcollection in Firestore
export async function saveContent(contentType: string, data: any) {
  try {
    const userId = await getUserId();
    const isNewPost = !data.createdAt; // A simple way to check if it's a new post

    if (isNewPost) {
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const userRole = userData?.role || 'freeUser';

        if (userRole === 'freeUser') {
            const postsCollection = getUserCollection(userId, contentType);
            const postsSnapshot = await postsCollection.count().get();
            const postCount = postsSnapshot.data().count;

            if (postCount >= FREE_USER_POST_LIMIT) {
                return { 
                    success: false, 
                    error: `Free users are limited to ${FREE_USER_POST_LIMIT} posts. Please upgrade to create more.` 
                };
            }
        }
    }
    
    // Handle image upload if mainImage is a data URI
    const finalImageUrl = data.mainImage ? await uploadImageIfNeeded(data.mainImage, data.slug) : '';

    const dataToSave = {
      ...data,
      mainImage: finalImageUrl,
      createdAt: data.createdAt || Date.now(),
    };

    const docRef = getUserDoc(userId, contentType, data.slug);
    await docRef.set(dataToSave, { merge: true });
    
    console.log(`Saved content for user ${userId} in ${contentType} with slug: ${data.slug}`);
    
    revalidatePath('/dashboard');
    
    return { success: true, slug: data.slug, savedData: dataToSave };
  } catch (error: any) {
    console.error("Error saving document: ", error);
    return { success: false, error: error.message || "Failed to save to Firestore." };
  }
}

// Publish content to GitHub
export async function publishContent(contentType: string, data: any) {
  try {
    // First, ensure the content is saved and the image is uploaded
    const saveResult = await saveContent(contentType, data);
    if (!saveResult.success || !saveResult.savedData) {
        return { success: false, error: saveResult.error || "Could not save content before publishing." };
    }

    const finalData = saveResult.savedData;

    const settingsResult = await getSettings();
    if (!settingsResult.success || !settingsResult.data) {
        return { success: false, error: "GitHub settings not found. Please configure them first." };
    }
    const { githubUser, githubRepo, installationId, githubBranch } = settingsResult.data;

    if (!installationId) {
        return { success: false, error: "GitHub App not connected. Please connect it in the settings." };
    }

    const markdownContent = `---
title: "${finalData.title || ''}"
slug: "${finalData.slug || ''}"
mainImage: "${finalData.mainImage || ''}"
---

${finalData.content || ''}
`;
    const date = new Date().toISOString().split('T')[0];
    const filePath = `_posts/${date}-${finalData.slug}.md`;
    const commitMessage = `feat: add new post '${finalData.title}'`;

    await commitFileToRepo({
        owner: githubUser,
        repo: githubRepo,
        installationId: installationId,
        path: filePath,
        content: markdownContent,
        isBase64: false,
        commitMessage,
        branch: githubBranch || 'main'
    });

    return { success: true, savedData: finalData };
  } catch (error: any) {
    console.error("Error publishing to GitHub: ", error);
    if (error.message.includes("'_posts' directory not found")) {
        return { success: false, error: "The '_posts' directory was not found in the repository. Please check your repository settings or create the directory." };
    }
    return { success: false, error: error.message || "Failed to publish to GitHub." };
  }
}

// Upload an image to the GitHub repository
export async function uploadImageToRepo(base64Content: string, fileName: string) {
    try {
        const settingsResult = await getSettings();
        if (!settingsResult.success || !settingsResult.data) {
            return { success: false, error: "GitHub settings not found. Please configure them first." };
        }
        const { githubUser, githubRepo, installationId, githubBranch } = settingsResult.data;

        if (!installationId) {
            return { success: false, error: "GitHub App not connected. Please connect it in the settings." };
        }
        
        // Sanitize file name
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${safeFileName}`;
        
        // We assume images are stored in an 'assets/images' folder.
        // User must create this folder in their repository.
        const filePath = `assets/images/${uniqueFileName}`;
        const commitMessage = `feat: add image ${uniqueFileName}`;

        await commitFileToRepo({
            owner: githubUser,
            repo: githubRepo,
            installationId: installationId,
            path: filePath,
            content: base64Content,
            isBase64: true,
            commitMessage,
            branch: githubBranch || 'main'
        });
        
        // Construct the public URL for the image
        const imageUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${githubBranch || 'main'}/${filePath}`;

        return { success: true, url: imageUrl };
    } catch (error: any) {
        console.error("Error uploading image to GitHub: ", error);
        return { success: false, error: error.message || "Failed to upload image." };
    }
}

// Save settings to a user's 'settings' document in Firestore
export async function saveSettings(settings: { githubUser: string, githubRepo: string, githubBranch: string }) {
    try {
        if (!adminDb) throw new Error('Firebase Admin not initialized');
        const userId = await getUserId();
        const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        await settingsRef.set(settings, { merge: true });
        console.log(`GitHub settings saved to Firestore for user ${userId}.`);
        return { success: true };
    } catch (error: any) {
        console.error("Error saving settings: ", error);
        return { success: false, error: error.message || "Failed to save settings." };
    }
}

// Get settings from a user's 'settings' document in Firestore
export async function getSettings() {
    try {
        if (!adminDb) throw new Error('Firebase Admin not initialized');
        const userId = await getUserId();
        const docRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return { success: true, data: docSnap.data() };
        } else {
            console.log(`No settings document for user ${userId}!`);
            return { success: false, error: "Settings not found." };
        }
    } catch (error: any) {
        console.error("Error getting settings:", error);
        return { success: false, error: error.message || "Failed to fetch settings." };
    }
}

// Get all posts from a user's subcollection in Firestore
export async function getPosts(contentType: string): Promise<PostData[]> {
  try {
    const userId = await getUserId();
    const collectionRef = getUserCollection(userId, contentType);
    const querySnapshot = await collectionRef.orderBy('createdAt', 'desc').get();
    const posts = querySnapshot.docs.map(doc => ({ ...doc.data(), slug: doc.id }) as PostData);
    return posts;
  } catch (error: any) {
    console.error("Error fetching posts: ", error.message);
    if (error.message.includes('Not authenticated') || error.message.includes('Firebase Admin not initialized')) {
        return [];
    }
    throw error;
  }
}

// Get a single post from a user's subcollection in Firestore
export async function getPost(contentType: string, slug: string) {
  try {
    const userId = await getUserId();
    const docRef = getUserDoc(userId, contentType, slug);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { success: true, data: docSnap.data() };
    } else {
      console.log("No such document!");
      return { success: false, error: "Post not found." };
    }
  } catch (error: any)
    {
    console.error("Error getting document:", error);
    return { success: false, error: error.message || "Failed to fetch post." };
  }
}

// Delete a post from a user's subcollection in Firestore
export async function deletePost(contentType: string, slug: string) {
  try {
    const userId = await getUserId();
    const docRef = getUserDoc(userId, contentType, slug);
    await docRef.delete();
    console.log(`Deleted post with slug: ${slug} for user ${userId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting document: ", error);
    return { success: false, error: error.message || "Failed to delete post." };
  }
}

// This action is called from the client to set the session cookie
export async function createSessionCookie(idToken: string) {
    try {
        if (!adminAuth) throw new Error('Firebase Admin not initialized');
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        const cookieStore = await cookies();
        cookieStore.set('__session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to create session cookie:', error);
        return { success: false, error: 'Failed to create session.' };
    }
}

// This action is called to sign out the user
export async function signOutUser() {
    const sessionCookieName = '__session';
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(sessionCookieName)?.value;

    if (sessionCookie) {
        // Delete the cookie immediately to avoid issues with async operations.
        cookieStore.delete(sessionCookieName);
        try {
            if (!adminAuth) throw new Error('Firebase Admin not initialized');
            // Still verify the cookie to revoke the token
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
            await adminAuth.revokeRefreshTokens(decodedClaims.sub);
            return { success: true };
        } catch (error) {
            console.error('Failed to revoke session on server:', error);
            // The cookie is already deleted, but we signal a failure in server-side cleanup.
            return { success: false, error: 'Failed to sign out properly.' };
        }
    }

    return { success: true }; // No cookie to begin with
}

// This action upgrades a user to the 'proUser' role.
export async function upgradeToPro() {
    try {
        if (!adminDb) throw new Error('Firebase Admin not initialized');
        const userId = await getUserId();
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({ role: 'proUser' });
        console.log(`User ${userId} upgraded to proUser.`);
        return { success: true };
    } catch (error: any) {
        console.error("Error upgrading user to Pro:", error);
        return { success: false, error: error.message || "Failed to upgrade user role." };
    }
}
