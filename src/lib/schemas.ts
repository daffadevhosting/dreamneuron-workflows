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


const schemas: Record<string, ContentSchema> = {
  post: postSchema,
  product: productSchema,
};

export function getSchema(type: string): ContentSchema | undefined {
  return schemas[type];
}

export function getAllSchemas(): ContentSchema[] {
    return Object.values(schemas);
}
