'use client';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-provider';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { PageTitleProvider } from '@/context/page-title-provider';
import type { ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

const initialOptions: ReactPayPalScriptOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID || 'sb',
  enableFunding: '',
  disableFunding: 'paylater,venmo,card',
  'data-sdk-integration-source': 'integrationbuilder_sc',
  currency: 'USD',
  intent: 'capture',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id-ID" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <PayPalScriptProvider options={initialOptions}>
          <AuthProvider>
            <PageTitleProvider>
              {children}
            </PageTitleProvider>
          </AuthProvider>
        </PayPalScriptProvider>
        <Toaster />
      </body>
    </html>
  );
}
