'use client'

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";

export function UpgradePage({ featureName }: { featureName: string }) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <div className="flex items-center justify-center h-[60vh]">
                <Card className="max-w-lg w-full text-center">
                    <CardContent className="p-10">
                         <div className="mx-auto w-fit rounded-full bg-yellow-400/20 p-4 mb-4 text-yellow-500">
                            <Zap className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold font-headline">Upgrade to Pro to Use the {featureName}</h2>
                        <p className="text-muted-foreground mt-2 mb-6">
                            This feature is exclusive to our Pro users. Upgrade your plan to unlock this and many other powerful features.
                        </p>
                        <Button size="lg" onClick={() => setModalOpen(true)}>
                            <Zap className="mr-2 h-4 w-4"/>
                            Upgrade to Pro
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <UpgradeModal isOpen={modalOpen} onOpenChange={setModalOpen} />
        </>
    )
}
