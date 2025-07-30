'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

type UpgradeModalProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

const ProFeatures = [
    "Unlimited Posts",
    "AI-Powered Content Generation",
    "AI Image Generation",
    "Publish to GitHub",
    "Priority Support"
];

export function UpgradeModal({ isOpen, onOpenChange }: UpgradeModalProps) {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

// Ganti fungsi createOrder
const createOrder = async () => {
  // Reset error state setiap kali order baru dibuat
  setError(null); 
  try {
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Tambahkan header ini sebagai praktik terbaik
      },
    });

    const orderData = await response.json();

    if (!response.ok) {
      // Backend kita mengembalikan { error: 'message' }, jadi kita gunakan orderData.error
      throw new Error(orderData.error || 'Gagal membuat pesanan PayPal.');
    }

    // Backend kita mengembalikan { id: '...' }
    return orderData.id;

  } catch (err: any) {
    // Log error dan perbarui UI
    console.error("Create order failed:", err);
    setError(err.message);

    // Lempar kembali error agar PayPal bisa menanganinya via 'onError'
    throw err; 
  }
};

  // Function to capture the order on the server after user approval
  const onApprove = async (data: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderID: data.orderID }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      // On successful payment, refresh user data and show success toast
      await refreshUser();
      toast({
        title: "Upgrade Successful!",
        description: "Welcome to the Pro plan! All features are now unlocked.",
      });
      onOpenChange(false);

    } catch (err: any) {
      setError(err.message);
      console.error("Capture order failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onError = (err: any) => {
    setError("An error occurred with the PayPal payment. Please try again.");
    console.error("PayPal Error:", err);
  };

  if (!paypalClientId) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configuration Error</DialogTitle>
                </DialogHeader>
                <p className="text-red-500">PayPal Client ID is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.</p>
            </DialogContent>
        </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
            <p className="text-4xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/one-time</span></p>
            <Badge variant="outline" className="mt-2">Lifetime Deal</Badge>
        </div>
        <DialogFooter>
            {isProcessing ? (
                <div className="w-full flex justify-center items-center flex-col">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Finalizing your payment...</p>
                </div>
            ) : (
                <div className="w-full">
                    {isOpen && (
                        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture", "disable-funding": "card" }}>
                            <PayPalButtons 
                                style={{ layout: "vertical", label: "pay" }}
                                createOrder={createOrder}
                                onApprove={onApprove}
                                onError={onError}
                            />
                        </PayPalScriptProvider>
                    )}
                    {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}