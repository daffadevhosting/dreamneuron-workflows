'use server';

import { adminDb } from '@/lib/firebase-admin';
import { getUserId } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { commitFileToRepo } from '@/lib/github';
import { revalidatePath } from 'next/cache';
import type { ContentSchema } from '@/lib/schemas';
import sharp from 'sharp';

// Helper to get the reference to a user document for content
function getUserContentDoc(userId: string, contentType: string, slug: string) {
    return adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType).doc(slug);
}

// Helper to get the reference to a user's settings document
function getUserSettingsDoc(userId: string) {
    return adminDb.collection('users').doc(userId).collection('settings').doc('github');
}

// Helper to get user settings data
async function getUserSettings() {
    const userId = await getUserId();
    const settingsRef = getUserSettingsDoc(userId);
    const settingsDoc = await settingsRef.get();
    if (!settingsDoc.exists) {
        throw new Error('GitHub settings not found. Please configure them on the settings page.');
    }
    return settingsDoc.data();
}

/**
 * Saves content as a draft in Firestore.
 * Handles both new content creation and updates.
 * For new content, it checks if the user has reached their post limit.
 */
export async function saveContent(contentType: string, data: any) {
    try {
        const userId = await getUserId();
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userRole = userSnap.data()?.role;

        const docRef = getUserContentDoc(userId, contentType, data.slug);
        const docSnap = await docRef.get();

        // Only check post limit for NEW posts, not for updates.
        if (!docSnap.exists) {
            // Free users are limited to 3 posts per content type.
            if (userRole === 'freeUser') {
                const contentCollection = adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType);
                const contentCount = (await contentCollection.count().get()).data().count;

                if (contentCount >= 3) {
                    throw new Error(`Free users are limited to 3 items of each content type. You currently have ${contentCount}.`);
                }
            }
        }
        
        await docRef.set({
            ...data,
            createdAt: docSnap.exists ? docSnap.data()?.createdAt : FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        revalidatePath('/dashboard');
        
        return { success: true, slug: data.slug };

    } catch (error: any) {
        console.error("Error saving content:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Publishes content to a GitHub repository.
 * It first saves the content as a draft, then commits it to GitHub.
 * It now compresses AI-generated images before committing.
 */
export async function publishContent(contentType: string, data: any) {
    try {
        const saveResult = await saveContent(contentType, data);
        if (!saveResult.success) {
            return saveResult; 
        }

        const settings = await getUserSettings();
        if (!settings?.githubUser || !settings?.githubRepo || !settings?.githubBranch || !settings?.installationId) {
            throw new Error('GitHub repository details are incomplete. Please check your settings.');
        }

        let finalContent = data.content;
        let finalMainImage = data.mainImage;

        // Check if the mainImage is a data URI, which indicates it's a new upload or AI-generated.
        if (data.mainImage && data.mainImage.startsWith('data:image')) {
            // New logic: Compress the image before uploading
            const base64Data = data.mainImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Use sharp to compress the image to WebP format with 80% quality.
            const compressedImageBuffer = await sharp(imageBuffer)
                .webp({ quality: 80 })
                .toBuffer();
            
            const compressedImageBase64 = compressedImageBuffer.toString('base64');

            // The image path will now always be .webp
            const imagePath = `images/${data.slug}.webp`;
            
            await commitFileToRepo({
                owner: settings.githubUser,
                repo: settings.githubRepo,
                installationId: settings.installationId,
                path: imagePath,
                content: compressedImageBase64, // Use the compressed image content
                commitMessage: `feat: add image for ${data.slug}`,
                branch: settings.githubBranch,
                isBase64: true
            });
            
            finalMainImage = `/${imagePath}`; // Update the final image path
        }
        
        const filePath = `_posts/${data.slug}.md`;
        const commitMessage = `feat: publish post "${data.title}"`;
        const markdownContent = `---
title: "${data.title}"
slug: "${data.slug}"
mainImage: "${finalMainImage || ''}"
---

${finalContent}`;

        await commitFileToRepo({
            owner: settings.githubUser,
            repo: settings.githubRepo,
            installationId: settings.installationId,
            path: filePath,
            content: markdownContent,
            commitMessage: commitMessage,
            branch: settings.githubBranch
        });
        
        // If the image path was updated, save the new path back to Firestore.
        if (finalMainImage !== data.mainImage) {
            const userId = await getUserId();
            const docRef = getUserContentDoc(userId, contentType, data.slug);
            await docRef.update({ mainImage: finalMainImage });
        }
        
        revalidatePath('/dashboard');
        return { success: true, slug: data.slug, savedData: { mainImage: finalMainImage } };

    } catch (error: any) {
        console.error("Error publishing content:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves a single post/content item by its slug for the current user.
 */
export async function getPost(contentType: string, slug: string) {
    try {
        const userId = await getUserId();
        const docRef = getUserContentDoc(userId, contentType, slug);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return { success: false, error: 'Post not found.' };
        }
        
        const postData = docSnap.data();
        if (postData) {
             if (postData.createdAt) postData.createdAt = postData.createdAt.toMillis();
             if (postData.updatedAt) postData.updatedAt = postData.updatedAt.toMillis();
        }

        return { success: true, data: postData };
    } catch (error: any) {
        console.error("Error getting post:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves all posts/content items of a specific type for the current user.
 */
export async function getPosts(contentType: string) {
    try {
        const userId = await getUserId();
        const collectionRef = adminDb.collection('users').doc(userId).collection('data').doc('content').collection(contentType);
        const snapshot = await collectionRef.orderBy('createdAt', 'desc').get();
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                createdAt: data.createdAt?.toMillis(),
                updatedAt: data.updatedAt?.toMillis(),
            };
        });

    } catch (error: any) {
        console.error(`Error getting posts for ${contentType}:`, error);
        return [];
    }
}

/**
 * Deletes a post/content item from Firestore for the current user.
 */
export async function deletePost(contentType: string, slug: string) {
    try {
        const userId = await getUserId();
        const docRef = getUserContentDoc(userId, contentType, slug);
        await docRef.delete();
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting post:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves all custom schemas created by the user.
 */
export async function getCustomSchemas(): Promise<ContentSchema[]> {
    try {
        const userId = await getUserId();
        const schemasCollection = adminDb.collection('users').doc(userId).collection('data').doc('content').collection('schemas');
        const snapshot = await schemasCollection.get();
        
        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => doc.data() as ContentSchema);
    } catch (error: any) {
        console.error("Error getting custom schemas:", error);
        return [];
    }
}

/**
 * Saves a new custom schema to Firestore for the current user.
 */
export async function saveSchema(schemaData: ContentSchema) {
    try {
        const userId = await getUserId();
        
        if (['post', 'product'].includes(schemaData.name)) {
            throw new Error(`Schema name "${schemaData.name}" is reserved. Please choose another name.`);
        }
        
        const docRef = adminDb.collection('users').doc(userId).collection('data').doc('content').collection('schemas').doc(schemaData.name);
        
        await docRef.set(schemaData, { merge: true });
        
        revalidatePath('/dashboard/schemas');
        revalidatePath('/dashboard');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving schema:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Saves GitHub settings to the current user's subcollection.
 */
export async function saveSettings(settings: any) {
    try {
        const userId = await getUserId();
        const settingsRef = getUserSettingsDoc(userId);
        await settingsRef.set(settings, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving settings:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves GitHub settings for the current user.
 */
export async function getSettings() {
    try {
        const userId = await getUserId();
        const settingsRef = getUserSettingsDoc(userId);
        const docSnap = await settingsRef.get();
        if (!docSnap.exists) {
            // Return success with null data if no settings are found.
            // This is not an error, just an empty state.
            return { success: true, data: null };
        }
        return { success: true, data: docSnap.data() };
    } catch (error: any) {
        console.error("Error getting settings:", error);
        return { success: false, error: error.message };
    }
}
