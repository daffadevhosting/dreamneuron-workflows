'use client';

import * as React from 'react';
import { useFieldArray, useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePage } from '@/components/upgrade-page';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveSchema } from '@/actions/content';
import { usePageTitle } from '@/context/page-title-provider';

const fieldSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z0-9_]+$/, 'Name can only contain lowercase letters, numbers, and underscores.'),
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['string', 'slug', 'text', 'image', 'markdown', 'number']),
  description: z.string().optional(),
  required: z.boolean(),
});

const schemaBuilderSchema = z.object({
  title: z.string().min(1, 'Schema title is required'),
  name: z.string().min(1, 'Schema name is required'),
  fields: z.array(fieldSchema).min(1, 'You must add at least one field.'),
});

type SchemaFormValues = z.infer<typeof schemaBuilderSchema>;

export default function SchemaEditorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);
    const { setTitle } = usePageTitle();

    React.useEffect(() => {
        setTitle('Schema Editor');
    }, [setTitle]);
    
    const form = useForm<SchemaFormValues>({
        resolver: zodResolver(schemaBuilderSchema),
        defaultValues: {
            title: '',
            name: '',
            fields: [
                { name: 'title', title: 'Title', type: 'string', description: 'The main title.', required: true },
                { name: 'slug', title: 'Slug', type: 'slug', description: 'The URL-friendly version of the title.', required: true },
            ]
        },
        mode: 'onChange'
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fields'
    });
    
    const watchTitle = form.watch('title');

    React.useEffect(() => {
        const createSlug = (text: string) => {
            if (!text) return '';
            return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        }
        form.setValue('name', createSlug(watchTitle));
    }, [watchTitle, form]);

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }
    
    if (user?.role === 'freeUser') {
        return <UpgradePage featureName="Custom Schemas" />;
    }
    
    async function onSubmit(data: SchemaFormValues) {
        setIsSaving(true);
        const result = await saveSchema(data);
        if (result.success) {
            toast({
                title: 'Schema Saved!',
                description: `The schema "${data.title}" has been saved.`
            });
            router.push('/dashboard/schemas');
        } else {
            toast({
                title: 'Error Saving Schema',
                description: result.error || 'An unknown error occurred.',
                variant: 'destructive'
            });
        }
        setIsSaving(false);
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">
                        Build and customize your content structure.
                    </p>
                     <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Schema
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Schema Details</CardTitle>
                        <CardDescription>Give your new schema a title. The name will be generated automatically.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Schema Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Custom T-Shirt" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Schema Name (auto-generated)</FormLabel>
                                    <FormControl>
                                        <Input readOnly disabled {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Fields</CardTitle>
                        <CardDescription>Define the fields for your content type.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <FormField
                                        control={form.control}
                                        name={`fields.${index}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Field Title</FormLabel>
                                                <FormControl><Input {...field} placeholder="e.g., Product Color" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`fields.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Field Name</FormLabel>
                                                <FormControl><Input {...field} placeholder="e.g., product_color" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`fields.${index}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Field Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="string">Short Text</SelectItem>
                                                        <SelectItem value="slug">Slug</SelectItem>
                                                        <SelectItem value="text">Long Text</SelectItem>
                                                        <SelectItem value="markdown">Markdown</SelectItem>
                                                        <SelectItem value="image">Image</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                 <FormField
                                    control={form.control}
                                    name={`fields.${index}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Textarea {...field} placeholder="A short description for this field." rows={2} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center space-x-2">
                                     <FormField
                                        control={form.control}
                                        name={`fields.${index}.required`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-1">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Required</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="absolute top-2 right-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => append({ name: '', title: '', type: 'string', description: '', required: false })}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Field
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </FormProvider>
    );
}
