'use client'
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { saveSettings, getSettings } from '@/actions/content';
import { Github } from 'lucide-react';

type GithubSettings = {
    githubUser: string;
    githubRepo: string;
    githubBranch: string;
    installationId?: string;
};

export default function SettingsPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<GithubSettings>({
        githubUser: '',
        githubRepo: '',
        githubBranch: '',
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSettings() {
            setIsLoading(true);
            const result = await getSettings();
            if (result.success && result.data) {
                setSettings(result.data as GithubSettings);
            }
            setIsLoading(false);
        }
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({...prev, [id]: value}));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await saveSettings(settings);
        if (result.success) {
            toast({
                title: 'Settings Saved',
                description: 'Your GitHub repository settings have been saved.',
            });
        } else {
             toast({
                title: 'Error',
                description: 'Could not save settings.',
                variant: 'destructive'
            });
        }
    };

    const handleConnectToGitHub = () => {
        const githubAppUrl = `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME}/installations/new`;
        window.location.href = githubAppUrl;
    };

    if (isLoading) {
        return <div>Loading settings...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Settings</h1>
                <p className="text-muted-foreground">
                    Configure your integrations and publishing settings.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>GitHub Pages Integration</CardTitle>
                    <CardDescription>
                        Set the destination repository for your published content. This will be used to create commits on your behalf.
                    </CardDescription>

                    <div className='float-right'>
                        {settings.installationId ? (
                            <p className="text-sm text-green-600">GitHub App Connected</p>
                        ) : (
                            <Button onClick={handleConnectToGitHub}>
                                <Github className="mr-2" />
                                Connect to GitHub
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="githubUser">GitHub Username</Label>
                            <Input 
                                id="githubUser" 
                                placeholder="e.g., your-username"
                                value={settings.githubUser || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="githubRepo">GitHub Repository</Label>
                            <Input 
                                id="githubRepo" 
                                placeholder="e.g., your-repo-name"
                                value={settings.githubRepo || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="githubBranch">Branch</Label>
                            <Input 
                                id="githubBranch" 
                                placeholder="e.g., main or master"
                                value={settings.githubBranch || ''}
                                onChange={handleChange}
                            />
                            <p className="text-sm text-muted-foreground">
                                Leave blank to use 'main' as the default branch.
                            </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                        <Button type="submit">
                            Save GitHub Settings
                        </Button>
                    </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}