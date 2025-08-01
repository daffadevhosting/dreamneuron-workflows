'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { PlusCircle, Edit, Trash2, ChevronDown, Newspaper, ShoppingBag, FilePlus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPosts, deletePost } from '@/actions/content';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentCard } from '@/components/dashboard/content-card';
import { getAllSchemas, ContentSchema } from '@/lib/schemas';
import { useAuth } from '@/hooks/use-auth';
import { usePageTitle } from '@/context/page-title-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ContentData = {
  title: string;
  slug: string;
  mainImage: string;
  content?: string;
  description?: string;
  createdAt: number;
  price?: number;
};

type AllContent = {
    [key: string]: ContentData[];
}

const EmptyState = ({ schemaName, schemaTitle }: { schemaName: string, schemaTitle: string }) => {
    const href = `/dashboard/content/${schemaName}`;
    
    return (
        <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <CardContent className="p-10 text-center">
                <h3 className="text-lg font-semibold">No Content in {schemaTitle}</h3>
                <p className="text-muted-foreground mb-4">
                    Click the button below to create your first item.
                </p>
                <Link href={href} passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New {schemaTitle}
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

const NoSchemasWelcome = () => (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold font-headline">Welcome to DreamNeuron!</CardTitle>
            <CardDescription>
                It looks like you don't have any content types (Schemas) set up yet. Go to the Schema Manager to create your first one.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-8">
            <Link href="/dashboard/schemas/edit" passHref>
                 <Button>
                    <FilePlus className="mr-2 h-4 w-4" />
                    Create a Schema
                </Button>
            </Link>
        </CardContent>
    </Card>
)

export default function DashboardPage() {
  const [allContent, setAllContent] = useState<AllContent>({});
  const [schemas, setSchemas] = useState<ContentSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle('Dashboard');
  }, [setTitle]);
  
  useEffect(() => {
    const fetchAllData = async () => {
        if (!user) return;
        setIsLoading(true);
        
        try {
            const userSchemas = await getAllSchemas();
            setSchemas(userSchemas);
            
            if (userSchemas.length > 0) {
                const contentPromises = userSchemas.map(s => getPosts(s.name));
                const allFetchedContent = await Promise.all(contentPromises);
                
                const contentMap: AllContent = {};
                userSchemas.forEach((schema, index) => {
                    contentMap[schema.name] = allFetchedContent[index] as unknown as ContentData[];
                });
                
                setAllContent(contentMap);
            }
        } catch (e) {
            console.error("Failed to fetch dashboard data", e);
            toast({
                title: 'Error Loading Dashboard',
                description: 'Could not load your content. Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    if (user) {
        fetchAllData();
    }
  }, [user, toast]);

  const handleEdit = (schemaName: string, slug: string) => {
    router.push(`/dashboard/content/${schemaName}?slug=${slug}`);
  };

  const handleDelete = async (schemaName: string, slugToDelete: string) => {
    const schema = schemas.find(s => s.name === schemaName);
    const schemaTitle = schema?.title || 'item';
    
    if (window.confirm(`Are you sure you want to delete this ${schemaTitle}? This action cannot be undone.`)) {
        const result = await deletePost(schemaName, slugToDelete);
        if (result.success) {
            setAllContent(prev => ({
                ...prev,
                [schemaName]: prev[schemaName].filter(p => p.slug !== slugToDelete)
            }));
            toast({
                title: `${schemaTitle} Deleted`,
                description: `The content has been permanently deleted.`,
            });
        } else {
            toast({
                title: 'Error',
                description: result.error || `Could not delete the content.`,
                variant: 'destructive',
            });
        }
    }
  };

  const getIconForSchema = (schemaName: string) => {
      if (schemaName.includes('post')) return <BookOpen className="mr-2 h-4 w-4" />;
      if (schemaName.includes('product')) return <ShoppingBag className="mr-2 h-4 w-4" />;
      return <FilePlus className="mr-2 h-4 w-4" />;
  }
  
  const noSchemas = !isLoading && schemas.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <p className="text-muted-foreground">
              {noSchemas 
                ? "Let's get you set up."
                : "Create and manage all your content from one place."}
            </p>
        </div>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div tabIndex={0}> {/* Wrapper for Tooltip with disabled button */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={noSchemas}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create New
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Create a new item in...</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {schemas.map(s => (
                                    <DropdownMenuItem key={s.name} asChild>
                                        <Link href={`/dashboard/content/${s.name}`}>
                                            {getIconForSchema(s.name)}
                                            {s.title}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipTrigger>
                {noSchemas && (
                    <TooltipContent>
                        <p>Create a schema first to start adding content.</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
      </div>
      
       {isLoading ? (
          <p>Loading your dashboard...</p>
      ) : noSchemas ? (
          <NoSchemasWelcome />
      ) : (
          <Tabs defaultValue={schemas.length > 0 ? schemas[0].name : ''} className="w-full">
              <TabsList>
                  {schemas.map(schema => (
                       <TabsTrigger key={schema.name} value={schema.name}>
                           {schema.title} ({allContent[schema.name]?.length || 0})
                       </TabsTrigger>
                  ))}
              </TabsList>
              {schemas.map(schema => (
                  <TabsContent key={schema.name} value={schema.name}>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:col-cols-4 mt-4">
                          {allContent[schema.name] && allContent[schema.name].length > 0 ? (
                              allContent[schema.name].map((item) => (
                                  <ContentCard key={item.slug} item={item} type={schema.name} onEdit={handleEdit} onDelete={handleDelete} />
                              ))
                          ) : (
                              <EmptyState schemaName={schema.name} schemaTitle={schema.title}/>
                          )}
                      </div>
                  </TabsContent>
              ))}
          </Tabs>
      )}
    </div>
  );
}
