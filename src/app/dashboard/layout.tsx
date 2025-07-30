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
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings, LogOut, Loader2, Newspaper, Zap, ShoppingBag, BookOpen } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { UpgradeModal } from '@/components/upgrade-modal';
import { Badge } from '@/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

function UpgradeCard() {
    const [modalOpen, setModalOpen] = useState(false);
    
    return (
        <>
            <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-2 text-center">
                    <CardDescription className="mb-2">
                        You're on the Free Plan. Upgrade to unlock all features.
                    </CardDescription>
                    <Button size="sm" className="w-auto" onClick={() => setModalOpen(true)}>
                        <Zap className="mr-2 h-4 w-4"/>
                        Upgrade to Pro
                    </Button>
                </CardContent>
            </Card>
            <UpgradeModal isOpen={modalOpen} onOpenChange={setModalOpen} />
        </>
    );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard/content')) {
      const contentType = pathname.split('/').pop();
      return contentType ? `Edit ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}` : 'Content';
    }
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/dashboard/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const menuVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

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
          <motion.div initial="hidden" animate="visible" variants={menuVariants}>
            <SidebarMenu>
              <motion.div variants={menuItemVariants}>
                <SidebarMenuItem>
                  <Link href="/dashboard" passHref>
                    <SidebarMenuButton isActive={pathname === '/dashboard'}>
                      <LayoutDashboard />
                      Dashboard
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </motion.div>
              <motion.div variants={menuItemVariants}>
                <Collapsible asChild>
                  <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={pathname.startsWith('/dashboard/content')}>
                              <FileText />
                              Content
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                          <SidebarMenuSub>
                              <SidebarMenuItem>
                                  {/* PERUBAHAN DI SINI: asChild dipindahkan ke SidebarMenuSubButton */}
                                  <Link href="/dashboard/content/post" passHref>
                                      <SidebarMenuSubButton isActive={pathname.includes('/post')} asChild>
                                      <span>
                                          <BookOpen />
                                          Blog Posts
                                      </span>
                                      </SidebarMenuSubButton>
                                  </Link>
                              </SidebarMenuItem>
                              {user?.role === 'pro' && (
                               <SidebarMenuItem>
                                  {/* PERUBAHAN DI SINI: asChild dipindahkan ke SidebarMenuSubButton */}
                                  <Link href="/dashboard/content/product" passHref>
                                      <SidebarMenuSubButton isActive={pathname.includes('/product')} asChild>
                                      <span>
                                          <ShoppingBag />
                                          Products
                                      </span>
                                      </SidebarMenuSubButton>
                                  </Link>
                              </SidebarMenuItem>
                              )}
                          </SidebarMenuSub>
                      </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </motion.div>
              <motion.div variants={menuItemVariants}>
                <SidebarMenuItem>
                  <Link href="/dashboard/settings" passHref>
                    <SidebarMenuButton isActive={pathname === '/dashboard/settings'}>
                      <Settings />
                      Settings
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </motion.div>
            </SidebarMenu>
          </motion.div>
        </SidebarContent>
        
        {user.role === 'freeUser' && <UpgradeCard />}

        <SidebarFooter>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL || ''} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium flex items-center gap-2">
                            {user.displayName}
                            {user.role && <Badge variant="secondary" className="capitalize">{user.role.replace('User', '')}</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                </Button>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between p-4 border-b h-16">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
            </div>
            <Link href="/dashboard/settings" passHref>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
