
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as crypto from 'crypto';

/**
 * Verifies the signature of the incoming webhook request.
 * @param request The incoming NextRequest.
 * @param secret The webhook secret from environment variables.
 * @returns The raw request body text if verification is successful.
 * @throws An error if the signature is invalid or missing.
 */
async function verifySignature(request: NextRequest, secret: string): Promise<string> {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
        throw new Error('No signature found on request');
    }

    const bodyText = await request.text();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(bodyText, 'utf-8');
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid signature');
    }

    return bodyText;
}

/**
 * Handles incoming webhooks from GitHub.
 * Specifically listens for the 'installation' event with an 'deleted' action
 * to clean up the installation ID from Firestore when a user uninstalls the app.
 */
export async function POST(request: NextRequest) {
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('GITHUB_WEBHOOK_SECRET is not set.');
        return new NextResponse('Webhook secret not configured', { status: 500 });
    }

    try {
        // First, verify the request is genuinely from GitHub
        const rawBody = await verifySignature(request, webhookSecret);
        const payload = JSON.parse(rawBody);

        const event = request.headers.get('x-github-event');

        // We are interested in the 'installation' event, specifically when it's deleted.
        if (event === 'installation' && payload.action === 'deleted') {
            const installationId = payload.installation.id.toString();
            console.log(`Received uninstall event for installation ID: ${installationId}`);

            if (!adminDb) throw new Error('Firebase Admin not initialized');

            // Find the user associated with this installation ID
            const settingsQuery = adminDb.collectionGroup('settings').where('installationId', '==', installationId);
            const querySnapshot = await settingsQuery.get();

            if (querySnapshot.empty) {
                console.log(`No user found with installation ID ${installationId}. Nothing to do.`);
                return new NextResponse('Installation not found', { status: 200 });
            }

            // Use a batch to delete the field from all found documents (should typically be one)
            const batch = adminDb.batch();
            const { FieldValue } = await import('firebase-admin/firestore');

            querySnapshot.forEach(doc => {
                console.log(`Removing installationId from user settings at: ${doc.ref.path}`);
                batch.update(doc.ref, { installationId: FieldValue.delete() });
            });

            await batch.commit();
            console.log(`Successfully removed installation ID ${installationId} from user settings.`);
        }

        // Acknowledge other webhooks gracefully
        return new NextResponse('Webhook received', { status: 200 });

    } catch (error: any) {
        console.error(`Webhook Error: ${error.message}`);
        // For signature errors, we send a 401 Unauthorized response.
        if (error.message.toLowerCase().includes('signature')) {
            return new NextResponse(error.message, { status: 401 });
        }
        // For other errors, a 400 Bad Request is more appropriate.
        return new NextResponse(error.message, { status: 400 });
    }
}
