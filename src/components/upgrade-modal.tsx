'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import type { OnApproveData, CreateSubscriptionActions } from '@paypal/paypal-js';

type UpgradeModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const ProFeatures = [
  'Unlimited Posts',
  'AI-Powered Content Generation',
  'AI Image Generation',
  'Publish to GitHub',
  'Custom Schemas',
];

export function UpgradeModal({ isOpen, onOpenChange }: UpgradeModalProps) {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [{ isPending, isResolved }, dispatch] = usePayPalScriptReducer();
  const [scriptProviderKey, setScriptProviderKey] = useState(Date.now());

  const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_ENABLED === 'true';
  const PAYPAL_PLAN_ID = isSandbox
    ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_PLAN_ID
    : process.env.NEXT_PUBLIC_PAYPAL_LIVE_PLAN_ID;
  const paypalClientId = isSandbox
    ? process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID
    : process.env.NEXT_PUBLIC_PAYPAL_LIVE_CLIENT_ID;

  // Fungsi baru untuk menangani penutupan modal
  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setScriptProviderKey(Date.now());
      setError(null); // Juga bersihkan error
    }
    onOpenChange(open);
  };

  if (!paypalClientId || !PAYPAL_PLAN_ID) {
    return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent className="max-w-md">
        <PayPalScriptProvider
          // ✅ GUNAKAN KEY DI SINI
          key={scriptProviderKey} 
          options={{
            clientId: paypalClientId || '',
            intent: 'subscription',
            vault: true,
            disableFunding: 'paylater,venmo',
          }}
        >
          <DialogHeader>
            <DialogTitle>Configuration Error</DialogTitle>
          </DialogHeader>
          <p className="text-red-500 py-4">
            PayPal Client ID or Plan ID is not configured. Please check your environment variables.
          </p>
        </PayPalScriptProvider>
      </DialogContent>
    </Dialog>
    );
  }

  const createSubscription = (data: Record<string, unknown>, actions: CreateSubscriptionActions) => {
    if (!user) {
      const authError = 'You must be logged in to subscribe.';
      setError(authError);
      toast({ title: 'Authentication Error', description: authError, variant: 'destructive' });
      return Promise.reject(new Error(authError));
    }
    setError(null);
    return actions.subscription.create({
      plan_id: PAYPAL_PLAN_ID,
      custom_id: user.uid,
    });
  };

  const onApprove = async (data: OnApproveData) => {
    setIsProcessing(true);
    setError(null);
    toast({
      title: 'Payment Approved!',
      description: 'Your payment was successful. Activating your subscription...',
    });

    try {
      await refreshUser();
      toast({
        title: 'Upgrade Complete!',
        description: 'Welcome to the Pro plan. Your new features are now unlocked.',
        duration: 5000,
      });
    } catch (e) {
      toast({
        title: 'Sync Error',
        description: 'Could not immediately sync your new role. Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      onOpenChange(false);
    }
  };

  const onError = (err: any) => {
    const message = err.message || 'An unknown error occurred with PayPal.';
    setError(message);
    toast({
      title: 'Payment Error',
      description: message,
      variant: 'destructive',
    });
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            intent: 'subscription',
            vault: true,
            disableFunding: 'paylater,venmo',
          }}
          deferLoading={true}
        >
          <DialogHeader className="text-center">
            <div className="mx-auto w-fit rounded-full bg-yellow-400/20 p-2 mb-2 text-yellow-500">
              <Star className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-bold font-headline">Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Unlock all features and take your content creation to the next level.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="space-y-2">
              {ProFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-center my-4">
            <p className="text-4xl font-bold">
              $9.99<span className="text-lg font-normal text-muted-foreground">/month</span>
            </p>
            <Badge variant="outline" className="mt-2">
              Billed Monthly
            </Badge>
          </div>
          <DialogFooter className="flex-col items-center">
            {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
            <div className="min-h-[120px] w-full flex items-center justify-center">
              {isProcessing ? (
                <div className="flex flex-col justify-center items-center gap-2 text-center h-full">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  <p className="text-muted-foreground">
                    Finalizing your upgrade... <br /> Please wait, this window will close automatically.
                  </p>
                </div>
              ) : (
                <PayPalButtonsWrapper
                  createSubscription={createSubscription}
                  onApprove={onApprove}
                  onError={onError}
                  disabled={isProcessing || !user || !PAYPAL_PLAN_ID}
                />
              )}
            </div>
          </DialogFooter>
        </PayPalScriptProvider>
      </DialogContent>
    </Dialog>
  );
}

interface PayPalButtonsWrapperProps {
  createSubscription: (data: Record<string, unknown>, actions: CreateSubscriptionActions) => Promise<string>;
  onApprove: (data: OnApproveData) => Promise<void>;
  onError: (err: any) => void;
  disabled: boolean;
}

function PayPalButtonsWrapper({ createSubscription, onApprove, onError, disabled }: PayPalButtonsWrapperProps) {
  const [{ isPending, isResolved }] = usePayPalScriptReducer();

  return (
    <>
      {isPending || !isResolved ? (
        <div className="flex flex-col justify-center items-center gap-2 text-center h-full">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading PayPal...</p>
        </div>
      ) : (
        <PayPalButtons
          style={{ layout: 'vertical', shape: 'rect', label: 'subscribe' }}
          fundingSource="paypal"
          createSubscription={createSubscription}
          onApprove={onApprove}
          onError={onError}
          disabled={disabled}
        />
      )}
    </>
  );
}