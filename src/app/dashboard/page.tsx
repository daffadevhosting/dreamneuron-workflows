'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Edit, Trash2, ChevronDown, Newspaper, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPosts, deletePost } from '@/actions/content';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ContentData = {
  title: string;
  slug: string;
  mainImage: string;
  content?: string;
  description?: string;
  createdAt: number;
  price?: number;
};

const ContentCard = ({ item, type, onEdit, onDelete }: { item: ContentData, type: string, onEdit: (slug: string) => void, onDelete: (slug: string) => void }) => (
    <Card>
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
            <p className="text-sm text-muted-foreground line-clamp-2">
                {item.content || item.description}
            </p>
        </CardContent>
        <CardFooter className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => onEdit(item.slug)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </Button>
            <Button className="flex-1" variant="destructive" onClick={() => onDelete(item.slug)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </CardFooter>
    </Card>
);

const EmptyState = ({ type }: { type: string }) => {
    const singular = type.slice(0, -1);
    const plural = type;
    const ctaText = `New ${singular.charAt(0).toUpperCase() + singular.slice(1)}`;
    const href = `/dashboard/content/${singular}`;

    return (
        <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-10 text-center">
                <h3 className="text-lg font-semibold">No {plural} Found</h3>
                <p className="text-muted-foreground mb-4">
                    Click the button below to create your first {singular}.
                </p>
                <Link href={href} passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {ctaText}
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<ContentData[]>([]);
  const [products, setProducts] = useState<ContentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAllContent() {
      setIsLoading(true);
      const [fetchedPosts, fetchedProducts] = await Promise.all([
        getPosts('post'),
        getPosts('product')
      ]);
      setPosts(fetchedPosts as ContentData[]);
      setProducts(fetchedProducts as ContentData[]);
      setIsLoading(false);
    }
    fetchAllContent();
  }, []);

  const handleEdit = (type: string, slug: string) => {
    router.push(`/dashboard/content/${type}?slug=${slug}`);
  };

  const handleDelete = async (type: string, slugToDelete: string) => {
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    if (window.confirm(`Are you sure you want to delete this ${typeName}? This action cannot be undone.`)) {
        const result = await deletePost(type, slugToDelete);
        if (result.success) {
            if (type === 'post') {
                setPosts(posts.filter(p => p.slug !== slugToDelete));
            } else {
                setProducts(products.filter(p => p.slug !== slugToDelete));
            }
            toast({
                title: `${typeName} Deleted`,
                description: `The ${typeName.toLowerCase()} has been permanently deleted.`,
            });
        } else {
            toast({
                title: 'Error',
                description: `Could not delete the ${typeName.toLowerCase()}.`,
                variant: 'destructive',
            });
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <p className="text-muted-foreground">
              Create and manage all your content from one place.
            </p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/content/post">
                        <Newspaper className="mr-2 h-4 w-4" />
                        New Blog Post
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/content/product">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        New Product
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <Tabs defaultValue="posts" className="w-full">
          <TabsList>
              <TabsTrigger value="posts">Blog Posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {isLoading ? (
                      <p>Loading posts...</p>
                  ) : posts.length > 0 ? (
                      posts.map((item) => (
                          <ContentCard key={item.slug} item={item} type="post" onEdit={() => handleEdit('post', item.slug)} onDelete={() => handleDelete('post', item.slug)} />
                      ))
                  ) : (
                      <EmptyState type="posts" />
                  )}
              </div>
          </TabsContent>
          <TabsContent value="products">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {isLoading ? (
                      <p>Loading products...</p>
                  ) : products.length > 0 ? (
                      products.map((item) => (
                          <ContentCard key={item.slug} item={item} type="product" onEdit={() => handleEdit('product', item.slug)} onDelete={() => handleDelete('product', item.slug)} />
                      ))
                  ) : (
                      <EmptyState type="products" />
                  )}
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );
}
