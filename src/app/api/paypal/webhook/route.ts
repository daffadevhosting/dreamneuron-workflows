
import { NextRequest, NextResponse } from 'next/server';
import { upgradeToPro } from '@/actions/user';

async function getPayPalAccessToken() {
    const isSandbox = process.env.PAYPAL_SANDBOX_ENABLED === 'true';
    const clientId = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_ID : process.env.PAYPAL_LIVE_CLIENT_ID;
    const clientSecret = isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_SECRET : process.env.PAYPAL_LIVE_CLIENT_SECRET;
    const PAYPAL_API_URL = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    
    console.log('PayPal Webhook - isSandbox:', isSandbox);
    console.log('PayPal Webhook - clientId:', clientId ? '[CONFIGURED]' : '[MISSING]');
    console.log('PayPal Webhook - clientSecret:', clientSecret ? '[CONFIGURED]' : '[MISSING]');

    if (!clientId || !clientSecret) {
        console.error('PayPal client ID or secret is missing for the current environment.');
        throw new Error('PayPal API credentials are not configured.');
    }
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        console.error("Failed to get PayPal access token:", await response.text());
        throw new Error('Failed to get PayPal access token.');
    }

    const data = await response.json();
    return data.access_token;
}

async function verifyPayPalWebhook(request: NextRequest, accessToken: string) {
    const isSandbox = process.env.PAYPAL_SANDBOX_ENABLED === 'true';
    const PAYPAL_API_URL = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const webhookId = isSandbox ? process.env.PAYPAL_SANDBOX_WEBHOOK_ID : process.env.PAYPAL_LIVE_WEBHOOK_ID;

    if (!webhookId) {
        console.error("PayPal webhook ID is not set for the current environment.");
        return { success: false, body: null };
    }

    const requestBody = await request.clone().json();

    try {
        const verificationResponse = await fetch(`${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transmission_id: request.headers.get('paypal-transmission-id'),
                transmission_time: request.headers.get('paypal-transmission-time'),
                cert_url: request.headers.get('paypal-cert-url'),
                auth_algo: request.headers.get('paypal-auth-algo'),
                transmission_sig: request.headers.get('paypal-transmission-sig'),
                webhook_id: webhookId,
                webhook_event: requestBody,
            }),
        });

        if (!verificationResponse.ok) {
            console.error("Webhook verification request to PayPal failed:", await verificationResponse.text());
            return { success: false, body: null };
        }

        const verificationData = await verificationResponse.json();
        return { success: verificationData.verification_status === 'SUCCESS', body: requestBody };
    } catch (error) {
        console.error("Error during webhook verification POST request:", error);
        return { success: false, body: null };
    }
}

export async function POST(request: NextRequest) {
    console.log("--- PayPal Webhook Received ---");
    try {
        const accessToken = await getPayPalAccessToken();
        console.log("Got PayPal Access Token.");

        const { success: isVerified, body: webhookEvent } = await verifyPayPalWebhook(request, accessToken);
        
        console.log(`Webhook Verification Status: ${isVerified}`);
        
        if (!isVerified || !webhookEvent) {
            return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 403 });
        }
        
        console.log("Webhook Verified Successfully.");
        const eventType = webhookEvent.event_type;
        const resource = webhookEvent.resource;
        console.log(`Parsed Webhook Event Type: ${eventType}`);

        let userId: string | undefined;
        let subscriptionId: string | undefined;

        if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            console.log("Handling BILLING.SUBSCRIPTION.ACTIVATED event.");
            userId = resource.custom_id;
            subscriptionId = resource.id;
        } else if (eventType === 'PAYMENT.SALE.COMPLETED') {
            console.log("Handling PAYMENT.SALE.COMPLETED event for initial subscription payment.");
            userId = resource.custom; // For sale event, custom ID is here
            subscriptionId = resource.billing_agreement_id; // Subscription ID is here
        }

        if (userId && subscriptionId) {
            console.log(`Extracted User ID: ${userId}`);
            console.log(`Extracted Subscription ID: ${subscriptionId}`);
            
            console.log(`Attempting to upgrade user ${userId}...`);
            const upgradeResult = await upgradeToPro(userId, subscriptionId);

            if (upgradeResult.success) {
                console.log(`User ${userId} successfully upgraded to proUser via webhook.`);
                return NextResponse.json({ success: true, message: 'User upgraded successfully.' });
            } else {
                 console.error(`Failed to upgrade user ${userId}:`, upgradeResult.error);
                return NextResponse.json({ success: false, error: upgradeResult.error }, { status: 500 });
            }
        }
        
        console.log(`Received event type: ${eventType}. No action taken.`);
        return NextResponse.json({ success: true, message: 'Webhook received, no action required.' });

    } catch (error: any) {
        console.error('Error handling PayPal webhook:', error);
        return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
    }
}
