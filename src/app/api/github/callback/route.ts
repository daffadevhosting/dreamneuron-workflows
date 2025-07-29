
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Helper function to get the current user's UID from the session cookie
async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. Please log in.');
    }
    try {
        // We don't check for revocation here, just that the session is valid.
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Error verifying session cookie in callback:", error);
        throw new Error('Session expired or invalid. Please log in again.');
    }
}

/**
 * Handles the callback from GitHub after a user installs the GitHub App.
 * It expects an `installation_id` in the query parameters.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');

  const redirectUrl = new URL('/dashboard/settings', request.url);

  // We only care about the 'install' action which provides the installation ID.
  if (setupAction === 'install' && installationId) {
    try {
      const userId = await getUserId();
      if (!adminDb) throw new Error('Firebase Admin not initialized');

      const settingsRef = adminDb.collection('users').doc(userId).collection('settings').doc('github');
      
      // Atomically update the settings: save the new installationId and delete the old githubToken.
      // Using FieldValue.delete() is the proper way to remove a field in Firestore.
      const { FieldValue } = await import('firebase-admin/firestore');
      await settingsRef.set({ 
        installationId: installationId,
        githubToken: FieldValue.delete() // Remove the old, insecure token field.
      }, { merge: true });

      console.log(`GitHub App installation ID ${installationId} saved for user ${userId}.`);

      // Redirect user back to the settings page with a success message.
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('message', 'GitHub App connected successfully!');
      return NextResponse.redirect(redirectUrl);

    } catch (error: any) {
      console.error("Error processing GitHub installation callback: ", error);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', error.message || 'An unknown error occurred during setup.');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If the callback is invalid (e.g., missing parameters), redirect with an error.
  redirectUrl.searchParams.set('status', 'error');
  redirectUrl.searchParams.set('message', 'Invalid GitHub installation callback received.');
  return NextResponse.redirect(redirectUrl);
}
