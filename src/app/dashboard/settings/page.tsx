'use client'
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Impor komponen Select
import { useToast } from '@/hooks/use-toast';
import { saveSettings, getSettings } from '@/actions/content';
import { Github, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { usePageTitle } from '@/context/page-title-provider';

type GithubSettings = {
    githubUser: string;
    githubRepo: string;
    githubBranch: string;
    installationId?: string;
    githubAvatarUrl?: string;
    githubUsername?: string;
};

export default function SettingsPage() {
    const { toast } = useToast();
    const { setTitle } = usePageTitle();
    const [settings, setSettings] = useState<GithubSettings>({
        githubUser: '',
        githubRepo: '',
        githubBranch: '',
    });
    
    // State baru untuk UI dinamis
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [repoList, setRepoList] = useState<string[]>([]);
    const [branchList, setBranchList] = useState<string[]>([]);
    const [isFetchingBranches, setIsFetchingBranches] = useState(false);

    useEffect(() => {
        setTitle('Settings');
    }, [setTitle]);

    // Fungsi untuk mengambil daftar repositori
    const fetchRepos = async () => {
        try {
            const response = await fetch('/api/github/get-repos');
            const data = await response.json();
            if (response.ok) {
                setRepoList(data.repositories || []);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({ title: 'Error fetching repositories', description: (error as Error).message, variant: 'destructive' });
        }
    };

    // Efek untuk mengambil data awal dan daftar repo jika sudah terhubung

    useEffect(() => {
        // Pindahkan fetchRepos ke dalam useEffect agar tidak perlu jadi dependensi
        const fetchRepos = async () => {
            try {
                const response = await fetch('/api/github/get-repos');
                const data = await response.json();
                if (response.ok) {
                    setRepoList(data.repositories || []);
                } else {
                    // Jangan panggil toast di sini untuk menghindari dependensi
                    console.error('Error fetching repos:', data.error);
                }
            } catch (error) {
                console.error('Error fetching repos:', error);
            }
        };

        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const result = await getSettings();
                if (result.success && result.data) {
                    const fetchedSettings = result.data as GithubSettings;
                    setSettings(fetchedSettings);

                    if (fetchedSettings.installationId) {
                        // Ambil daftar repositori
                        await fetchRepos();

                        // Jika username belum ada, ambil infonya
                        if (!fetchedSettings.githubUsername) {
                            try {
                                const response = await fetch('/api/github/get-account-info');
                                const accountInfo = await response.json();
                                if (response.ok) {
                                    setSettings(prev => ({ ...prev, ...accountInfo }));
                                }
                            } catch (error) {
                                console.error("Fetch account info failed:", error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchInitialData();
        // Dependency array sekarang kosong, sehingga hanya berjalan sekali saat komponen dimuat
    }, []);

    // Efek untuk mengambil daftar branch setiap kali repositori berubah
    useEffect(() => {
        const selectedRepoFullName = `${settings.githubUser}/${settings.githubRepo}`;
        // Hanya jalankan jika ada repo yang dipilih di state
        if (!repoList.includes(selectedRepoFullName)) {
            setBranchList([]);
            return;
        };

        const [owner, repo] = selectedRepoFullName.split('/');

        async function fetchBranches() {
            if (!owner || !repo) return;
            setIsFetchingBranches(true);
            try {
                const response = await fetch(`/api/github/get-branches?owner=${owner}&repo=${repo}`);
                const data = await response.json();
                if (response.ok) {
                    setBranchList(data.branches || []);
                    // Jika branch yang tersimpan tidak ada di daftar baru, reset
                    if (data.branches && !data.branches.includes(settings.githubBranch)) {
                        setSettings(prev => ({ ...prev, githubBranch: '' }));
                    }
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                toast({ title: 'Error fetching branches', description: (error as Error).message, variant: 'destructive' });
            } finally {
                setIsFetchingBranches(false);
            }
        }

        fetchBranches();
    }, [settings.githubUser, settings.githubRepo, repoList, toast]); // Bergantung pada repo yang dipilih

    const handleRepoChange = (value: string) => {
        const [user, repo] = value.split('/');
        setSettings(prev => ({ ...prev, githubUser: user, githubRepo: repo, githubBranch: '' })); // Reset branch saat repo ganti
    };

    const handleBranchChange = (value: string) => {
        setSettings(prev => ({ ...prev, githubBranch: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await saveSettings(settings);
        if (result.success) {
            toast({ title: 'Settings Saved', description: 'Your GitHub settings have been saved.' });
        } else {
            toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive' });
        }
    };

    const handleConnectToGitHub = () => {
        setIsConnecting(true);
        const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
        window.location.href = `https://github.com/apps/${appName}/installations/new`;
    };

const handleReconnect = () => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
    window.location.href = `https://github.com/apps/${appName}/installations/new`;
};

const handleUninstall = () => {
    // Arahkan pengguna ke halaman uninstall di GitHub
    window.location.href = 'https://github.com/settings/installations';
};

    if (isLoading) return <div>Loading settings...</div>;

    const selectedRepoFullName = settings.githubUser && settings.githubRepo ? `${settings.githubUser}/${settings.githubRepo}` : "";

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>GitHub Pages Integration</CardTitle>
                    <CardDescription>
                        Set the destination repository for your published content. This will be used to create commits on your behalf.
                    </CardDescription>
{settings.installationId ? (
    <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 p-2 border rounded-md bg-slate-50">
            {settings.githubAvatarUrl ? (
                <Image
                    src={settings.githubAvatarUrl}
                    alt="GitHub Avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                />
            ) : (
                <Github className="h-6 w-6 text-slate-500" />
            )}
            <span className="text-sm font-medium text-slate-700">
                Connected as <strong>{settings.githubUsername || '...'}</strong>
            </span>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReconnect}>
                Sync / Change
            </Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-600" onClick={handleUninstall}>
                <Trash2 />
            </Button>
        </div>
    </div>
) : (
    // TOMBOL UNTUK KONEKSI (Tidak berubah)
    <Button onClick={handleConnectToGitHub} disabled={isConnecting}>
        {isConnecting ? <Loader2 className="mr-2 animate-spin" /> : <Github className="mr-2" />}
        Connect to GitHub
    </Button>
)}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="repo-select">GitHub Repository</Label>
                            <Select onValueChange={handleRepoChange} value={selectedRepoFullName} disabled={!settings.installationId}>
                                <SelectTrigger id="repo-select">
                                    <SelectValue placeholder="Select a repository..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {repoList.map(repo => (
                                        <SelectItem key={repo} value={repo}>{repo}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branch-select">Branch</Label>
                            <Select onValueChange={handleBranchChange} value={settings.githubBranch} disabled={!selectedRepoFullName || isFetchingBranches}>
                                <SelectTrigger id="branch-select">
                                    <SelectValue placeholder={isFetchingBranches ? "Fetching branches..." : "Select a branch..."} />
                                </SelectTrigger>
                                <SelectContent>
                                    {branchList.map(branch => (
                                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Button type="submit">Save GitHub Settings</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
