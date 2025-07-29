'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ContentSchema } from '@/lib/schemas';
import { EditorForm } from '@/components/editor/editor-form';
import { ContentPreview } from '@/components/editor/content-preview';
import { Button } from '@/components/ui/button';
import { saveContent, publishContent, getPost } from '@/actions/content';
import { useToast } from '@/hooks/use-toast';
import { AISuggestionButton } from '@/components/editor/ai-suggestion-button';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Dynamically create Zod schema from our custom schema
const createZodSchema = (schema: ContentSchema) => {
  const shape: Record<string, z.ZodType<any, any>> = {};
  for (const field of schema.fields) {
    let zodField: z.ZodType<any, any> = z.string();
    if (field.required) {
      zodField = zodField.min(1, { message: `${field.title} is required.` });
    } else {
      // Make non-required fields optional and default to an empty string
      zodField = z.string().optional().default('');
    }
    shape[field.name] = zodField;
  }
  return z.object(shape);
};

export function Editor({ schema, contentType }: { schema: ContentSchema, contentType: string }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const zodSchema = createZodSchema(schema);

  const defaultValues = schema.fields.reduce((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {} as Record<string, string>);

  const form = useForm({
    resolver: zodResolver(zodSchema),
    mode: 'onChange',
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    const slug = searchParams.get('slug');
    if (slug) {
      const fetchPostData = async () => {
        const result = await getPost(contentType, slug);
        if (result.success && result.data) {
          Object.keys(result.data).forEach(key => {
            form.setValue(key as any, result.data[key], { shouldValidate: true });
          });
        } else {
          toast({
            title: 'Error',
            description: 'Could not load the post data.',
            variant: 'destructive',
          });
        }
      };
      fetchPostData();
    }
  }, [searchParams, form, schema.fields, contentType, toast]);


  const watchedData = form.watch();
  
  const handleSaveOrPublish = async (handler: typeof saveContent | typeof publishContent, data: any) => {
      const result = await handler(contentType, data);

      if (result.success) {
          const action = handler === saveContent ? 'Saved' : 'Published';
          toast({
            title: `Content ${action}!`,
            description: `Your changes have been ${action.toLowerCase()}.`,
          });
          
          // After a successful save/publish, the image is now a URL.
          // We update the form state to reflect this, preventing re-uploads.
          if (result.savedData && result.savedData.mainImage) {
              form.setValue('mainImage', result.savedData.mainImage, { shouldDirty: false, shouldValidate: false });
          }

          if (result.slug && !searchParams.get('slug')) {
              router.replace(`/dashboard/content/${contentType}?slug=${result.slug}`);
          }
      } else {
          const action = handler === saveContent ? 'Save' : 'Publish';
          toast({
            title: `${action} Failed`,
            description: result.error || `Could not ${action.toLowerCase()} the content.`,
            variant: 'destructive',
          });
      }
  };


  const handleSave = async (data: any) => {
    setIsSaving(true);
    await handleSaveOrPublish(saveContent, data);
    setIsSaving(false);
  };

  const handlePublish = async (data: any) => {
    setIsPublishing(true);
    await handleSaveOrPublish(publishContent, data);
    setIsPublishing(false);
  };

  return (
    <FormProvider {...form}>
      <form>
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-headline">{schema.title} Editor</h1>
          <div className="flex gap-2">
            <AISuggestionButton contentSchema={schema} form={form} />
            <Button variant="outline" onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button onClick={form.handleSubmit(handlePublish)} disabled={isPublishing}>
              {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <EditorForm schema={schema} />
          </div>
          <div>
            <ContentPreview title={schema.title} data={watchedData} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
