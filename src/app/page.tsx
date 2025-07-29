import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, LayoutGrid, Wand2, GitBranch, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <LayoutGrid className="h-8 w-8 text-primary" />,
    title: 'Schema-Driven Content',
    description: 'Define your own content structures. Create blog posts, product pages, or anything you can imagine with flexible, reusable schemas.',
  },
  {
    icon: <Wand2 className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Generation',
    description: 'Supercharge your workflow. Generate full content drafts and unique header images from a simple title, exclusive for Pro users.',
  },
  {
    icon: <GitBranch className="h-8 w-8 text-primary" />,
    title: 'Publish to GitHub',
    description: 'Take full control of your content. Publish your posts directly as Markdown files to your own GitHub repository with a single click.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold">DreamNeuron</h1>
        </div>
        <Link href="/login" passHref>
          <Button>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </header>

      <main className="flex-grow">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight text-foreground">
              The Headless CMS <br /> That Works For <span className="text-primary">You</span>.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              DreamNeuron is a schema-driven content management system that combines structured content with the power of AI, publishing directly to your GitHub repository.
            </p>
            <div className="mt-10">
              <Link href="/login" passHref>
                <Button size="lg">
                  Start Creating for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline">A Better Way to Manage Content</h2>
              <p className="mt-2 text-muted-foreground">
                Focus on creating, not coding. Here's how we help.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-fit bg-primary/10 p-4 rounded-xl mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} DreamNeuron. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
