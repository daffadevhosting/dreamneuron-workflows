'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

type ContentData = {
  title: string;
  slug: string;
  mainImage: string;
  content?: string;
  description?: string;
  createdAt: number;
  price?: number;
};

type ContentCardProps = {
    item: ContentData;
    type: string; // Changed from 'post' | 'product' to string to support custom schemas
    onEdit: (type: string, slug: string) => void;
    onDelete: (type: string, slug: string) => void;
};

export const ContentCard = ({ item, type, onEdit, onDelete }: ContentCardProps) => (
    <Card className="max-w-md w-96 mx-auto md:w-full md:max-w-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <CardHeader>
            <CardTitle className="truncate">{item.title || 'Untitled'}</CardTitle>
            <CardDescription>
                /{item.slug}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {type === 'product' && item.price && (
                <p className="font-semibold text-lg mb-2">${item.price}</p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                {item.content || item.description}
            </p>
        </CardContent>
        <CardFooter className="flex gap-2">
            <Button className="w-full" variant="outline" onClick={() => onEdit(type, item.slug)}>
                <Edit className="mr-1 h-4 w-4" />
                Edit
            </Button>
            <Button className="w-full" variant="destructive" onClick={() => onDelete(type, item.slug)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
            </Button>
        </CardFooter>
    </Card>
);
