'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Loader2, Wand2, ClipboardPaste } from 'lucide-react';
import { suggestContentIdeas, ContentSuggestionOutput } from '@/ai/flows/content-suggestion';
import { ContentSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UseFormReturn } from 'react-hook-form';

type Suggestion = ContentSuggestionOutput['suggestions'][0];

export function AISuggestionButton({ 
  contentSchema,
  form
}: { 
  contentSchema: ContentSchema;
  form: UseFormReturn<any>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const schemaString = JSON.stringify(contentSchema.fields.map(f => ({ name: f.name, type: f.type, description: f.description })), null, 2);
      const result = await suggestContentIdeas({ contentSchema: schemaString });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      toast({
        title: 'Error',
        description: 'Could not generate content ideas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (suggestion: Suggestion) => {
    form.setValue('title', suggestion.title, { shouldValidate: true, shouldDirty: true });
    form.setValue('slug', suggestion.slug, { shouldValidate: true, shouldDirty: true });
    form.setValue('content', suggestion.content, { shouldValidate: true, shouldDirty: true });
    setIsOpen(false);
    toast({
        title: 'Content Pasted!',
        description: 'The generated content has been added to the form.',
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        <Wand2 className="mr-2 h-4 w-4" />
        Generate Content
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-2xl w-[90vw]">
          <SheetHeader>
            <SheetTitle>AI Content Generation</SheetTitle>
            <SheetDescription>
              Generate full articles based on your '{contentSchema.title}' schema.
            </SheetDescription>
          </SheetHeader>
          <div className="py-8">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : suggestions.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="space-y-4 pr-6">
                    {suggestions.map((idea, index) => (
                        <Card key={index} className="bg-secondary">
                            <CardHeader>
                                <CardTitle className="text-lg">{idea.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none h-40 overflow-y-auto mb-4 border rounded-md p-2 bg-background">
                                    {idea.content}
                                </div>
                                <Button className="w-full" onClick={() => handlePaste(idea)}>
                                    <ClipboardPaste className="mr-2 h-4 w-4"/>
                                    Use This Content
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </ScrollArea>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>Click "Generate Content" to start.</p>
                </div>
            )}
          </div>
          <SheetFooter className="absolute bottom-0 right-0 left-0 p-6 bg-background border-t">
            <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Content
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
