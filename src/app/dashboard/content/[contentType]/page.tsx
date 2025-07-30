'use client';

import { getSchema } from '@/lib/schemas';
import { Editor } from '@/components/editor/editor';
import { notFound, useParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/upgrade-modal';

export default function EditorPage() {
  const params = useParams();
  const contentType = params.contentType as string;

  const schema = getSchema(contentType);
  const { user } = useAuth();
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);

  if (!schema) {
    notFound();
  }

  if (schema.proTier && user?.role !== 'pro') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold">Upgrade to Pro to access this feature</h2>
        <p className="text-gray-500 mb-4">This content type is only available for Pro users.</p>
        <Button onClick={() => setUpgradeModalOpen(true)}>Upgrade Now</Button>
        <UpgradeModal isOpen={isUpgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Editor schema={schema} contentType={contentType} />
    </Suspense>
  );
}