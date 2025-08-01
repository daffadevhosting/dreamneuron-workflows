'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { generateProductDescription } from '@/ai/flows/product-description';

export function AIDescriptionButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { setValue, watch } = useFormContext();
  const { user } = useAuth();
  
  const productName = watch('title');

  const handleGenerate = async () => {
    if (!productName) {
        toast({
            title: 'Product Name Required',
            description: 'Please enter a product name to generate a description.',
            variant: 'destructive',
        });
        return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProductDescription({ productName });
      setValue('description', result.description, { shouldValidate: true, shouldDirty: true });
      toast({
        title: 'AI Description Generated!',
        description: 'The product description has been filled in.',
      });
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate the description.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (user?.role !== 'proUser') {
      return null;
  }

  return (
    <Button 
        type="button" 
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating || !productName}
    >
        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate with AI
    </Button>
  );
}
