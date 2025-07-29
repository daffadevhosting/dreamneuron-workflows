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
import { upgradeToPro } from "@/actions/content";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

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
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handlePayment = async () => {
    setIsUpgrading(true);
    // In a real application, you would handle the PayPal payment flow here.
    // On successful payment confirmation (e.g., via webhook), you would call upgradeToPro.
    // For this simulation, we'll call it directly.
    
    // Simulate API call to PayPal and then our backend
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const result = await upgradeToPro();

    if (result.success) {
      await refreshUser(); // Refresh user data on the client
      toast({
        title: "Upgrade Successful!",
        description: "Welcome to the Pro plan! All features are now unlocked.",
      });
      onOpenChange(false);
    } else {
      toast({
        title: "Upgrade Failed",
        description: result.error || "Could not complete the upgrade. Please contact support.",
        variant: "destructive",
      });
    }

    setIsUpgrading(false);
  };
  
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
            <p className="text-4xl font-bold">$10<span className="text-lg font-normal text-muted-foreground">/month</span></p>
            <Badge variant="outline" className="mt-2">Billed Annually</Badge>
        </div>
        <DialogFooter>
          <Button className="w-full" size="lg" onClick={handlePayment} disabled={isUpgrading}>
            {isUpgrading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Upgrade with PayPal
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
