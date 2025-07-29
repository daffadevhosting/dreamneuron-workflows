'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

function SimpleMarkdown({ content }: { content: string | undefined }) {
    if (!content) return <p className="text-muted-foreground">Start typing your content...</p>;
    
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            {content.split('\n').map((line, i) => {
                if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-xl font-bold mt-2">{line.substring(4)}</h3>
                }
                if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-2xl font-bold mt-4">{line.substring(3)}</h2>
                }
                if (line.startsWith('# ')) {
                    return <h1 key={i} className="text-3xl font-bold mt-6">{line.substring(2)}</h1>
                }
                 if (line.trim() === '') {
                    return <br key={i} />;
                }
                return <p key={i}>{line}</p>
            })}
        </div>
    )
}

export function ContentPreview({ title, data }: { title: string; data: any }) {
  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl font-headline break-words">
            {data.title || 'Your Title Here'}
          </h1>
          <p className="text-muted-foreground text-sm">
            Slug: /{data.slug || 'your-slug-here'}
          </p>
          
          {data.mainImage && (
            <div className="aspect-video relative overflow-hidden rounded-lg mt-4 border">
              <Image
                src={data.mainImage}
                alt={data.title || 'Preview image'}
                fill
                className="object-cover"
                data-ai-hint="article preview image"
              />
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <SimpleMarkdown content={data.content} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
