'use client';
import { useState } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadCloud, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/image-generation';
import { useAuth } from '@/hooks/use-auth';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ImageUpload({ field }: { field: ControllerRenderProps<any, string> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { setValue, watch } = useFormContext();
  const { user } = useAuth();

  const title = watch('title');
  const imageUrl = watch(field.name);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: 'File Too Large',
          description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          variant: 'destructive',
        });
        return;
      }
      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a JPG, PNG, GIF, or WEBP image.',
          variant: 'destructive',
        });
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setValue(field.name, base64String, { shouldValidate: true, shouldDirty: true });
        toast({
            title: 'Image Ready',
            description: 'The image is ready for preview. Save the draft to upload it.',
        });
      };
      reader.onerror = () => {
         toast({
            title: 'Error',
            description: 'Failed to read the selected file.',
            variant: 'destructive',
        });
      }
    }
  };

  const handleGenerateClick = async () => {
    if (!title) {
        toast({
            title: 'Title Required',
            description: 'Please enter a title for your post to generate an image.',
            variant: 'destructive',
        });
        return;
    }
    setIsGenerating(true);
    try {
        const result = await generateImage({ prompt: title });
        setValue(field.name, result.imageDataUri, { shouldValidate: true, shouldDirty: true });
        toast({
            title: 'AI Image Generated!',
            description: 'The image is ready for preview. Save the draft to upload it to your repo.',
        });
    } catch (error: any) {
        toast({
            title: 'Generation Failed',
            description: error.message || 'Could not generate the image.',
            variant: 'destructive',
        });
    } finally {
        setIsGenerating(false);
    }
  }

  const handleRemove = () => {
    setValue(field.name, '', { shouldValidate: true, shouldDirty: true });
  };
  
  const fileInputId = `file-input-${field.name}`;

  return (
    <div className="space-y-4">
      <Input type="hidden" {...field} value={imageUrl || ''} />
      {isLoading || isGenerating ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isGenerating ? 'Generating with AI...' : 'Processing...'}
          </p>
        </div>
      ) : imageUrl ? (
        <div className="relative group">
          <Image
            src={imageUrl}
            alt="Uploaded image"
            width={800}
            height={400}
            className="rounded-lg border object-cover w-full aspect-video"
            data-ai-hint="blog post image"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove Image</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
          <label htmlFor={fileInputId} className="cursor-pointer flex flex-col items-center justify-center text-center">
            <UploadCloud className="w-10 h-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF up to {MAX_FILE_SIZE_MB}MB
            </p>
          </label>
          <Input
            id={fileInputId}
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            disabled={isLoading || isGenerating}
          />
        </div>
      )}

      {user?.role === 'proUser' && (
        <Button 
            type="button" 
            variant="outline" 
            className="w-full" 
            onClick={handleGenerateClick}
            disabled={isGenerating || isLoading || !title}
        >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate with AI
        </Button>
      )}
    </div>
  );
}
