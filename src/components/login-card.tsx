'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Newspaper } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.5,4.73 16.1,5.65 17.1,6.54L19.3,4.41C17.43,2.77 15.18,1.75 12.19,1.75C6.9,1.75 2.75,6.07 2.75,12C2.75,17.93 6.9,22.25 12.19,22.25C17.6,22.25 21.6,18.33 21.6,12.27C21.6,11.66 21.5,11.33 21.35,11.1Z"></path>
    </svg>
);

export function LoginCard() {
  const { user, loginWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-3 rounded-lg mb-4 w-fit">
            <Newspaper className="w-8 h-8 text-primary"/>
        </div>
        <CardTitle className="text-3xl font-bold font-headline">DreamNeuron</CardTitle>
        <CardDescription>
          Sign in to your account to access the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full text-base py-6"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full text-base py-6" disabled>
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub (Soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
