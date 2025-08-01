'use client';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings, LogOut, Loader2, Newspaper, Zap, ShoppingBag, BookOpen, FilePlus, FileJson } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { UpgradeModal } from '@/components/upgrade-modal';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { getAllSchemas, ContentSchema } from '@/lib/schemas';
import { PageTitleProvider, usePageTitle } from '@/context/page-title-provider';

function UpgradeCard() {
    const [modalOpen, setModalOpen] = useState(false);
    
    return (
        <>
            <Card className="m-2 bg-primary/10 border-primary/20">
                <CardContent className="p-3 text-center">
                    <CardDescription className="mb-2">
                        You're on the Free Plan. Upgrade to unlock all features.
                    </CardDescription>
                    <Button size="sm" className="w-full" onClick={() => setModalOpen(true)}>
                        <Zap className="mr-2 h-4 w-4"/>
                        Upgrade to Pro
                    </Button>
                </CardContent>
            </Card>
            <UpgradeModal isOpen={modalOpen} onOpenChange={setModalOpen} />
        </>
    );
}

function DashboardNav() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { setOpenMobile } = useSidebar();
    const [schemas, setSchemas] = useState<ContentSchema[]>([]);
    const [isLoadingSchemas, setIsLoadingSchemas] = useState(true);

    useEffect(() => {
        const fetchSchemas = async () => {
            // Only fetch schemas if the user object is available
            if (user) {
                setIsLoadingSchemas(true);
                try {
                    const fetchedSchemas = await getAllSchemas();
                    setSchemas(fetchedSchemas);
                } catch (error) {
                    console.error("Failed to fetch schemas", error);
                } finally {
                    setIsLoadingSchemas(false);
                }
            }
        };
        fetchSchemas();
    }, [user]); // Depend on the user object

    const handleLinkClick = () => {
        if (setOpenMobile) {
            setOpenMobile(false);
        }
    };
    
    const getIconForSchema = (schemaName: string) => {
      if (schemaName === 'post') return <BookOpen />;
      if (schemaName === 'product') return <ShoppingBag />;
      return <FileJson />;
    }

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="text-xl font-semibold">DreamNeuron</h1>
                </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/dashboard" passHref onClick={handleLinkClick}>
                    <SidebarMenuButton isActive={pathname === '/dashboard'}>
                      <LayoutDashboard />
                      Dashboard
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                
                <Collapsible asChild defaultOpen>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={pathname.startsWith('/dashboard/content')}>
                                <FileText />
                                Content
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                            <SidebarMenuSub>
                                {isLoadingSchemas ? (
                                    <SidebarMenuItem>
                                        <SidebarMenuSubButton asChild><span><Loader2 className="animate-spin" />Loading...</span></SidebarMenuSubButton>
                                    </SidebarMenuItem>
                                ) : (
                                    schemas.map(schema => (
                                         <SidebarMenuItem key={schema.name}>
                                            <Link href={`/dashboard/content/${schema.name}`} passHref onClick={handleLinkClick}>
                                                <SidebarMenuSubButton isActive={pathname.includes(`/${schema.name}`)} asChild>
                                                <span>
                                                    {getIconForSchema(schema.name)}
                                                    {schema.title}
                                                </span>
                                                </SidebarMenuSubButton>
                                            </Link>
                                        </SidebarMenuItem>
                                    ))
                                )}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
                
                <SidebarMenuItem>
                  <Link href="/dashboard/schemas" passHref onClick={handleLinkClick}>
                    <SidebarMenuButton isActive={pathname.startsWith('/dashboard/schemas')}>
                      <FileJson />
                      Schemas
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <Link href="/dashboard/settings" passHref onClick={handleLinkClick}>
                    <SidebarMenuButton isActive={pathname === '/dashboard/settings'}>
                      <Settings />
                      Settings
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            
            {user?.role === 'freeUser' && <UpgradeCard />}

            <SidebarFooter>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user?.photoURL || ''} data-ai-hint="user avatar" />
                            <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium flex items-center gap-2">
                                {user?.displayName}
                                {user?.role && <Badge variant="secondary" className="capitalize">{user.role.replace('User', '')}</Badge>}
                            </span>
                            <span className="text-xs text-muted-foreground">{user?.email}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout}>
                        <LogOut className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

function DashboardHeader() {
    const { title } = usePageTitle();
    return (
        <header className="flex items-center gap-4 p-4 border-b h-16">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold truncate">{title}</h1>
        </header>
    )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <SidebarProvider>
          <DashboardNav />
          <SidebarInset>
            <DashboardHeader/>
            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
    )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageTitleProvider>
        <DashboardContent>
            {children}
        </DashboardContent>
    </PageTitleProvider>
  );
}
