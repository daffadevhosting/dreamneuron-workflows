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
import { usePageTitle } from '@/context/page-title-provider';

// Dynamically create Zod schema from our custom schema
const createZodSchema = (schema: ContentSchema) => {
  const shape: Record<string, z.ZodType<any, any>> = {};
  for (const field of schema.fields) {
    let zodField: z.ZodType<any, any>;

    switch(field.type) {
        case 'number':
            // For numbers, we coerce string input to a number.
            let numberField = z.coerce.number();
            if (field.required) {
                // Ensure it's not zero if required, as coerce turns empty string to 0.
                // We use min(1) for required number fields to avoid 0 being a valid input from an empty string.
                numberField = numberField.min(1, { message: `${field.title} is required.` });
            }
            zodField = numberField;
            break;
        default:
            // Default to string for all other types
            let stringField = z.string();
            if (field.required) {
                zodField = stringField.min(1, { message: `${field.title} is required.` });
            } else {
                zodField = z.string().optional().default('');
            }
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
  const { setTitle } = usePageTitle();
  
  useEffect(() => {
    setTitle(`${schema.title} Editor`);
  }, [setTitle, schema.title]);
  
  const zodSchema = createZodSchema(schema);

  const defaultValues = schema.fields.reduce((acc, field) => {
    acc[field.name] = field.type === 'number' ? 0 : '';
    return acc;
  }, {} as Record<string, any>);

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
          
          if (result.savedData && result.savedData.mainImage) {
              form.setValue('mainImage', result.savedData.mainImage, { shouldDirty: false, shouldValidate: false });
          }

          // Important: check for slug on the success object
          if (result.slug && !searchParams.get('slug')) {
              router.replace(`/dashboard/content/${contentType}?slug=${result.slug}`);
          }
      } else {
          const action = handler === saveContent ? 'Save' : 'Publish';
          
          // Specific check for the free user limit error
          if (result.error && result.error.includes('Free users are limited to')) {
              toast({
                title: 'Post Limit Reached',
                description: result.error + ' Please upgrade to the Pro plan to create more content.',
                variant: 'destructive',
              });
          } else {
              toast({
                title: `${action} Failed`,
                description: result.error || `Could not ${action.toLowerCase()} the content.`,
                variant: 'destructive',
              });
          }
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
            <p className="text-muted-foreground">
                Fill in the fields below to create or edit your content.
            </p>
          <div className="flex gap-2">
            {contentType !== 'product' && <AISuggestionButton contentSchema={schema} form={form} />}
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
