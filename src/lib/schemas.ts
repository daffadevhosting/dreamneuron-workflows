import { getCustomSchemas as fetchCustomSchemas } from '@/actions/content';

export type SchemaField = {
  name: string;
  title: string;
  type: 'string' | 'slug' | 'text' | 'image' | 'markdown' | 'number';
  description?: string;
  required?: boolean;
};

export type ContentSchema = {
  name: string;
  title: string;
  fields: SchemaField[];
  proTier?: boolean; // Added to mark schemas as pro-only
};

export const postSchema: ContentSchema = {
  name: 'post',
  title: 'Blog Post',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      required: true,
      description: 'The main title of the blog post.',
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      required: true,
      description: 'The URL-friendly version of the title.',
    },
    {
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      description: 'The primary image for the blog post.',
    },
    {
      name: 'content',
      title: 'Content',
      type: 'markdown',
      required: true,
      description: 'The main body of the blog post, written in Markdown.',
    },
  ],
};

export const productSchema: ContentSchema = {
    name: 'product',
    title: 'Product',
    proTier: true, // Explicitly mark this as a Pro feature
    fields: [
        {
            name: 'title',
            title: 'Product Name',
            type: 'string',
            required: true,
            description: 'The name of the product.'
        },
        {
            name: 'slug',
            title: 'Product Slug',
            type: 'slug',
            required: true,
            description: 'The URL-friendly version of the product name.'
        },
        {
            name: 'price',
            title: 'Price (USD)',
            type: 'number',
            required: true,
            description: 'The price of the product in USD.'
        },
        {
            name: 'mainImage',
            title: 'Product Image',
            type: 'image',
            description: 'The primary image for the product.'
        },
        {
            name: 'description',
            title: 'Description',
            type: 'markdown',
            required: true,
            description: 'A detailed description of the product in Markdown.'
        }
    ]
};

// Store built-in schemas in a plain object
const builtInSchemas: Record<string, ContentSchema> = {
  post: postSchema,
  product: productSchema,
};

// A cache for custom schemas to avoid fetching them repeatedly on the client
let allSchemasCache: ContentSchema[] | null = null;

// Function to get all schemas (built-in + custom)
export async function getAllSchemas(): Promise<ContentSchema[]> {
    const customSchemas = await fetchCustomSchemas();
    const allSchemas = [...Object.values(builtInSchemas), ...customSchemas];
    allSchemasCache = allSchemas; // Store in cache
    return allSchemas;
}

// This function now handles both built-in and custom schemas
// It's async to handle fetching custom schemas when needed
export async function getSchema(type: string): Promise<ContentSchema | undefined> {
  // Use the cached "all schemas" if available, otherwise fetch.
  const schemas = allSchemasCache || await getAllSchemas();
  return schemas.find(s => s.name === type);
}
