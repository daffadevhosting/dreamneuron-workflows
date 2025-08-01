'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getUserId } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

// This action initializes a new user in Firestore.
export async function initializeUser(userData: { uid: string, email?: string | null, displayName?: string | null, photoURL?: string | null }) {
    try {
        if (!adminDb) throw new Error('Firebase Admin not initialized');
        const { uid, email, displayName, photoURL } = userData;

        const userRef = adminDb.collection('users').doc(uid);
        
        // Only create the document if it doesn't already exist.
        const userSnap = await userRef.get();
        if (userSnap.exists) {
            return { success: true, message: "User already exists." };
        }

        await userRef.set({
            uid,
            email,
            displayName,
            photoURL,
            role: 'freeUser', // Assign default role
            createdAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error initializing user: ", error);
        return { success: false, error: error.message || "Failed to initialize user." };
    }
}


// This action is called from the client to set the session cookie
export async function createSessionCookie(idToken: string) {
    try {
        if (!adminAuth) throw new Error('Firebase Admin not initialized');
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        (await cookies()).set('__session', sessionCookie, {
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
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
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


/**
 * Upgrades a user to the 'proUser' role. 
 * This function is designed to be called from a secure server environment (like a webhook handler)
 * and not directly as a server action from the client.
 */
export async function upgradeToPro(userId: string, subscriptionId: string) {
    try {
        if (!adminDb) {
            throw new Error('Firebase Admin not initialized');
        }
        
        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({ 
            role: 'proUser',
            paypalSubscriptionId: subscriptionId,
            upgradedAt: FieldValue.serverTimestamp()
        });

        console.log(`User ${userId} upgraded to proUser with subscription ${subscriptionId}.`);
        return { success: true };

    } catch (error: any) {
        console.error(`Error upgrading user ${userId} to Pro:`, error);
        return { success: false, error: error.message || "Failed to upgrade user role in database." };
    }
}
