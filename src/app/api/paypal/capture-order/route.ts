
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_URL } = process.env;

// Helper function to get the current user's UID from the session cookie
async function getUserId() {
    if (!adminAuth) throw new Error('Firebase Admin not initialized');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Not authenticated. Please log in.');
    }
    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
        return decodedClaims.uid;
    } catch (error) {
        throw new Error('Session expired or invalid. Please log in again.');
    }
}

// This helper function gets a PayPal access token.
async function getPayPalAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_API_URL) {
        throw new Error("Missing PayPal credentials in environment variables.");
    }
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get PayPal access token: ${errorData.error_description}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Captures a PayPal order after the user approves the payment.
 * If the payment is successful, it updates the user's role to 'proUser' in Firestore.
 */
export async function POST(request: NextRequest) {
    try {
        const { orderID } = await request.json();
        if (!orderID) {
            return new NextResponse('Missing orderID', { status: 400 });
        }

        const accessToken = await getPayPalAccessToken();
        const url = `${PAYPAL_API_URL}/v2/checkout/orders/${orderID}/capture`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        // Check if the payment was successfully completed
        if (response.ok && data.status === 'COMPLETED') {
            console.log(`Payment for order ${orderID} completed successfully.`);

            // Now, upgrade the user's role in Firestore
            const userId = await getUserId();
            if (!adminDb) throw new Error('Firebase Admin not initialized');

            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({ role: 'proUser' });

            console.log(`User ${userId} successfully upgraded to proUser.`);

            return NextResponse.json({ success: true, order: data });
        } else {
            // Handle failed or pending payments
            console.error(`Failed to capture PayPal order ${orderID}. Status: ${data.status}`, data);
            throw new Error(`Payment not completed. Status: ${data.status}`);
        }

    } catch (error: any) {
        console.error("Error in capture-order route:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
