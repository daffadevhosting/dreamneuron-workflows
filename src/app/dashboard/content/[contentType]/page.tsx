import { getSchema } from '@/lib/schemas';
import { Editor } from '@/components/editor/editor';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

function EditorPageContents({ contentType }: { contentType: string }) {
  const schema = getSchema(contentType);

  if (!schema) {
    notFound();
  }

  return <Editor schema={schema} contentType={contentType} />;
}

export default async function EditorPage({ params }: { params: { contentType: string } }) {
  const { contentType } = await params;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPageContents contentType={contentType} />
    </Suspense>
  );
}