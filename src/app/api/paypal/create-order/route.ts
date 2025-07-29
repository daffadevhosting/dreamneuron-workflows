
import { NextResponse } from 'next/server';

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_URL } = process.env;

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
 * Creates a PayPal order and returns the order ID to the client.
 * The price is hardcoded here for the "Pro Plan".
 */
export async function POST() {
    try {
        const accessToken = await getPayPalAccessToken();
        const url = `${PAYPAL_API_URL}/v2/checkout/orders`;

        // Hardcoded price for the Pro plan. This can be made dynamic if needed.
        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'USD',
                        value: '9.99', // Example price for Pro User
                    },
                    description: 'Pro User Upgrade for ASSYA',
                },
            ],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("PayPal order creation failed:", errorData);
            throw new Error(`Failed to create PayPal order: ${errorData.message}`);
        }

        const data = await response.json();
        
        // Return the order ID to the client
        return NextResponse.json({ id: data.id });

    } catch (error: any) {
        console.error("Error in create-order route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
