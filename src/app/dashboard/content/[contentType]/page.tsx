'use client';

import { getSchema } from '@/lib/schemas';
import { Editor } from '@/components/editor/editor';
import { notFound, useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { UpgradePage } from '@/components/upgrade-page';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import type { ContentSchema } from '@/lib/schemas';

// This component remains a client component to handle state and user interaction
function EditorPageContents({ contentType }: { contentType: string }) {
  const { user, loading } = useAuth();
  const [schema, setSchema] = useState<ContentSchema | null | undefined>(undefined);

  useEffect(() => {
    const fetchAndSetSchema = async () => {
        const fetchedSchema = await getSchema(contentType);
        setSchema(fetchedSchema ?? null);
    };
    
    // Only fetch schema if the user object is available, to avoid race conditions.
    if (user) {
        fetchAndSetSchema();
    }
  }, [contentType, user]);
  

  if (loading || schema === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (schema === null) {
      notFound();
  }

  const userRole = user?.role || 'freeUser';
  
  // A schema is considered "Pro" if it has the proTier flag.
  // This explicitly locks the product schema for free users.
  const isProSchema = schema.proTier === true;

  // Free users cannot access pro schemas.
  if (userRole === 'freeUser' && isProSchema) {
    return <UpgradePage featureName={`"${schema.title}" content type`} />;
  }

  return <Editor schema={schema} contentType={contentType} />;
}


// This is the main page component, now using the useParams hook
export default function EditorPage() {
  const params = useParams();
  const contentType = params.contentType as string;

  return (
    <Suspense fallback={<div className="text-center p-8">Loading Editor...</div>}>
      <EditorPageContents contentType={contentType} />
    </Suspense>
  );
}
