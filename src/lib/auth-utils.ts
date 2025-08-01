'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Helper function to get the current user's UID from the session cookie
export async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. No session cookie found.');
    }
    try {
        // Restore checkRevoked to true for better security and handle potential errors gracefully.
        // A revoked session will be caught here, preventing unauthorized actions.
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie, likely revoked or expired:", error);
        // This provides a clearer, consistent error message when the cookie is invalid.
        throw new Error('Session expired or invalid. Please log in again.');
    }
}
