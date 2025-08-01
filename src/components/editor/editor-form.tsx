'use client';
import { useFormContext } from 'react-hook-form';
import { ContentSchema, SchemaField } from '@/lib/schemas';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from './image-upload';
import { AIDescriptionButton } from './ai-description-button';

const FieldComponent = ({ field, schemaName }: { field: SchemaField, schemaName: string }) => {
  const { control, setValue, watch } = useFormContext();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    // Only auto-generate slug if it's currently empty or follows the title's pattern
    const currentSlug = watch('slug');
    if (!currentSlug || currentSlug === createSlug(watch('title'))) {
      setValue('slug', createSlug(title), { shouldValidate: true });
    }
    setValue('title', title, { shouldDirty: true, shouldValidate: true });
  }

  const createSlug = (text: string) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
  }

  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem>
          <div className="flex justify-between items-center">
             <FormLabel>{field.title}</FormLabel>
             {schemaName === 'product' && field.name === 'description' && (
                <AIDescriptionButton />
             )}
          </div>
          <FormControl>
            <div>
              {field.name === 'title' && <Input {...formField} onChange={handleTitleChange} />}
              {field.name !== 'title' && field.type === 'string' && <Input {...formField} />}
              {field.type === 'slug' && <Input {...formField} placeholder="e.g., my-awesome-post" />}
              {field.type === 'text' && <Textarea {...formField} rows={5} />}
              {field.type === 'markdown' && <Textarea {...formField} rows={15} className="font-mono text-sm" />}
              {field.type === 'image' && <ImageUpload field={formField} />}
              {field.type === 'number' && <Input type="number" {...formField} />}
            </div>
          </FormControl>
          {field.description && <FormDescription>{field.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export function EditorForm({ schema }: { schema: ContentSchema }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {schema.fields.map((field) => (
          <FieldComponent key={field.name} field={field} schemaName={schema.name} />
        ))}
      </CardContent>
    </Card>
  );
}
