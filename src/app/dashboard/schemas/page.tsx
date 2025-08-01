'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, BookOpen, ShoppingBag, FileJson, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UpgradePage } from '@/components/upgrade-page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { postSchema, productSchema } from '@/lib/schemas';
import type { ContentSchema } from '@/lib/schemas';
import { getCustomSchemas } from '@/actions/content';
import { usePageTitle } from '@/context/page-title-provider';

const SchemaCard = ({ schema, isCustom }: { schema: ContentSchema, isCustom: boolean }) => (
    <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{schema.title}</CardTitle>
                    <CardDescription>/{schema.name}</CardDescription>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {schema.name === 'post' ? <BookOpen/> : schema.name === 'product' ? <ShoppingBag /> : <FileJson />}
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Contains {schema.fields.length} fields.
                 {schema.proTier && <span className="text-xs font-bold text-primary ml-2">(Pro)</span>}
            </p>
        </CardContent>
       <CardFooter className="flex gap-2">
            <Button className="w-full" variant="outline" disabled={!isCustom}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </Button>
            <Button className="w-full" variant="destructive" disabled={!isCustom}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </CardFooter>
    </Card>
);

export default function SchemasPage() {
    const { user, loading } = useAuth();
    const [customSchemas, setCustomSchemas] = React.useState<ContentSchema[]>([]);
    const [isLoadingSchemas, setIsLoadingSchemas] = React.useState(true);
    const { setTitle } = usePageTitle();

    React.useEffect(() => {
        setTitle('Schema Manager');
    }, [setTitle]);
    
    React.useEffect(() => {
        // Only fetch schemas if the user is a proUser
        if (user?.role === 'proUser') {
            const fetchSchemas = async () => {
                setIsLoadingSchemas(true);
                const schemas = await getCustomSchemas();
                setCustomSchemas(schemas);
                setIsLoadingSchemas(false);
            }
            fetchSchemas();
        } else if (!loading) { // If user is loaded and not a proUser
             setIsLoadingSchemas(false);
        }
    }, [user, loading]);

    if (loading) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        );
    }
    
    // Free users see an upgrade page instead of the full manager
    if (user?.role === 'freeUser') {
        return <UpgradePage featureName="Custom Schemas" />;
    }
    
    // Pro users see the full schema manager
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Schema Manager</h1>
                    <p className="text-muted-foreground">
                        Manage built-in and custom content structures.
                    </p>
                </div>
                <Link href="/dashboard/schemas/edit" passHref>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Custom Schema
                    </Button>
                </Link>
            </div>
            <div>
                <h2 className="text-xl font-semibold mb-4">Built-in Schemas</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <SchemaCard schema={postSchema} isCustom={false} />
                    <SchemaCard schema={productSchema} isCustom={false} />
                </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold mb-4">Your Custom Schemas</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {isLoadingSchemas ? (
                        <div className="md:col-span-2 lg:col-span-3 flex items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : customSchemas.length > 0 ? (
                       customSchemas.map(schema => (
                            <SchemaCard 
                                key={schema.name} 
                                schema={schema}
                                isCustom={true} 
                            />
                       ))
                    ) : (
                        <Card className="md:col-span-2 lg:col-span-3">
                            <CardContent className="p-10 text-center">
                                <h3 className="text-lg font-semibold">No Custom Schemas Found</h3>
                                <p className="text-muted-foreground mb-4">
                                    Click the button above to create your first custom schema.
                                </p>
                                <Link href="/dashboard/schemas/edit" passHref>
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create a Schema
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
