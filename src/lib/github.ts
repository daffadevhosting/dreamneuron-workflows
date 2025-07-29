// This service encapsulates the logic for interacting with the GitHub API.

type CommitFileToRepoParams = {
    owner: string;
    repo: string;
    token: string;
    path: string;
    content: string;
    commitMessage: string;
    branch?: string;
    isBase64?: boolean;
};

const GITHUB_API_URL = 'https://api.github.com';

async function githubApiRequest(url: string, token: string, options: RequestInit = {}) {
    const response = await fetch(`${GITHUB_API_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        if (response.status === 404) {
             const notFoundError = new Error(`Not Found: ${errorData.message} (URL: ${url})`);
             (notFoundError as any).status = 404;
             throw notFoundError;
        }
        if (response.status === 422) { // Unprocessable Entity - often for empty files/commits
             const validationError = new Error(`Validation Error: ${errorData.message} (URL: ${url})`);
             (validationError as any).status = 422;
             throw validationError;
        }
        throw new Error(`GitHub API Error: ${errorData.message} (URL: ${url})`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function checkDirExists(owner: string, repo: string, token: string, dirPath: string, branch: string) {
    try {
        const data = await githubApiRequest(`/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`, token);
        return Array.isArray(data);
    } catch (error: any) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}

export async function commitFileToRepo({
    owner,
    repo,
    token,
    path,
    content,
    commitMessage,
    branch = 'main',
    isBase64 = false,
}: CommitFileToRepoParams): Promise<void> {
    try {
        // Safety check for markdown posts
        if (path.startsWith('_posts/')) {
            const dirExists = await checkDirExists(owner, repo, token, '_posts', branch);
            if (!dirExists) {
                throw new Error(`Safety check failed: '_posts' directory not found in the '${branch}' branch.`);
            }
        }
        
        let existingFileSha: string | undefined;
        try {
            const fileData = await githubApiRequest(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, token);
            existingFileSha = fileData.sha;
        } catch (error: any) {
            if (error.status !== 404) {
                throw error;
            }
        }

        const encodedContent = isBase64 ? content : Buffer.from(content).toString('base64');
        
        const body: { message: string; content: string; sha?: string, branch: string } = {
            message: commitMessage,
            content: encodedContent,
            branch: branch
        };

        if (existingFileSha) {
            body.sha = existingFileSha;
        }

        await githubApiRequest(`/repos/${owner}/${repo}/contents/${path}`, token, {
            method: 'PUT',
            body: JSON.stringify(body),
        });

        console.log(`Successfully committed '${path}' to ${owner}/${repo} on branch ${branch}`);

    } catch (error) {
        console.error('Failed to commit to GitHub repository:', error);
        throw error;
    }
}