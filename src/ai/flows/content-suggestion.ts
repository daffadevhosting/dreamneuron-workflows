'use server';
/**
 * @fileOverview AI-powered content suggestion flow.
 *
 * - suggestContentIdeas - A function that generates content ideas based on a schema.
 * - ContentSuggestionInput - The input type for the suggestContentIdeas function.
 * - ContentSuggestionOutput - The return type for the suggestContentIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentSuggestionInputSchema = z.object({
  contentSchema: z.string().describe('The content schema definition.'),
});
export type ContentSuggestionInput = z.infer<typeof ContentSuggestionInputSchema>;

const ContentSuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string().describe('A catchy and relevant title for the content.'),
    slug: z.string().describe('A URL-friendly slug based on the title.'),
    content: z.string().describe('The full body of the content, written in Markdown format.')
  })).describe('An array of full content suggestions.'),
});
export type ContentSuggestionOutput = z.infer<typeof ContentSuggestionOutputSchema>;

export async function suggestContentIdeas(input: ContentSuggestionInput): Promise<ContentSuggestionOutput> {
  return suggestContentIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentSuggestionPrompt',
  input: {schema: ContentSuggestionInputSchema},
  output: {schema: ContentSuggestionOutputSchema},
  prompt: `You are an AI content generator. Based on the following content schema, generate a list of complete content packages. Each package must include a title, a slug, and the full content body in Markdown.

Content Schema:
{{{contentSchema}}}

Generate varied and interesting content. The slug should be a URL-friendly version of the title.

Suggestions (as a JSON array of objects):`,
});

const suggestContentIdeasFlow = ai.defineFlow(
  {
    name: 'suggestContentIdeasFlow',
    inputSchema: ContentSuggestionInputSchema,
    outputSchema: ContentSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
