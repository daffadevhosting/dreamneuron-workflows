import * as jwt from 'jsonwebtoken';

// The installation ID for the GitHub App, specific to a user's installation.
// This will be retrieved from the user's settings in Firestore.
type AuthParams = {
    installationId: string;
};

// Parameters for committing a file, now without the token.
type CommitFileToRepoParams = {
    owner: string;
    repo: string;
    path: string;
    content: string;
    commitMessage: string;
    branch?: string;
    isBase64?: boolean;
} & AuthParams; // Inherit installationId

// Parameters for getting repo branches
type GetRepoBranchesParams = {
    owner: string;
    repo: string;
} & AuthParams; // Inherit installationId

const GITHUB_API_URL = 'https://api.github.com';

// --- GitHub App Authentication ---

/**
 * Creates a JSON Web Token (JWT) to authenticate as the GitHub App.
 * This token is short-lived (10 minutes) and is used to request an installation access token.
 */
function createAppAuthToken(): string {
    const privateKeyBase64 = process.env.GITHUB_PRIVATE_KEY_BASE64;
    const appId = process.env.GITHUB_APP_ID;

    if (!privateKeyBase64 || !appId) {
        throw new Error('GitHub App credentials (private key or App ID) are not configured in environment variables.');
    }
    // Decode Base64 to PEM utf8
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    const payload = {
        iat: Math.floor(Date.now() / 1000) - 60,      // Issued at time (60 seconds in the past)
        exp: Math.floor(Date.now() / 1000) + (10 * 60), // Expiration time (10 minutes from now)
        iss: appId                                      // Issuer (the App ID)
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Fetches a temporary installation access token for a specific user's installation.
 * This token is used to make API requests on behalf of the user.
 */
async function getInstallationAccessToken(installationId: string): Promise<string> {
    const appToken = createAppAuthToken();

    const response = await fetch(`${GITHUB_API_URL}/app/installations/${installationId}/access_tokens`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to get installation access token:", errorData);
        throw new Error(`Failed to get installation access token: ${errorData.message}`);
    }

    const data = await response.json();
    return data.token;
}

// --- GitHub API Requests ---

/**
 * A generic helper to make authenticated requests to the GitHub API.
 * It now takes an `installationId` and handles fetching the access token internally.
 */
async function githubApiRequest(url: string, installationId: string, options: RequestInit = {}) {
    const accessToken = await getInstallationAccessToken(installationId);

    const response = await fetch(`${GITHUB_API_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        if (response.status === 404) {
             const notFoundMessage = `Repository not found. Please check your GitHub settings and ensure the app has access to the repo. (URL: ${url})`;
             const notFoundError = new Error(notFoundMessage);
             (notFoundError as any).status = 404;
             throw notFoundError;
        }
        if (response.status === 422) { // Unprocessable Entity - often for empty files/commits
             const validationError = new Error(`Validation Error: ${errorData.message} (URL: ${url})`);
             (validationError as any).status = 422;
             throw validationError;
        }
        throw new Error(`GitHub API Error: ${errorData.message} (Status: ${response.status}, URL: ${url})`);
    }

    if (response.status === 204 || response.headers.get('Content-Length') === '0') {
        return null;
    }

    return response.json();
}

async function checkDirExists(owner: string, repo: string, installationId: string, dirPath: string, branch: string) {
    try {
        const data = await githubApiRequest(`/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`, installationId);
        return Array.isArray(data);
    } catch (error: any) {
        if (error.status === 404) {
            // This could be because the repo is not found OR the directory is not found.
            // The error from githubApiRequest is more specific, so we let it bubble up if it's a repo-level 404.
            // If it's a directory-level 404, we return false.
            // A simple way to check is to see if the error message includes "Repository not found"
            if (error.message.includes('Repository not found')) {
                throw error; // Re-throw the more specific error
            }
            return false; // Directory not found, which is fine, we just won't throw the safety check error.
        }
        throw error;
    }
}

export async function commitFileToRepo({
    owner,
    repo,
    installationId,
    path,
    content,
    commitMessage,
    branch = 'main',
    isBase64 = false,
}: CommitFileToRepoParams): Promise<void> {
    try {
        // Safety check for markdown posts
        if (path.startsWith('_posts/')) {
            const dirExists = await checkDirExists(owner, repo, installationId, '_posts', branch);
            if (!dirExists) {
                // The checkDirExists function will now throw a more specific error if the repo itself is not found
                throw new Error(`Safety check failed: The '_posts' directory was not found in the '${branch}' branch. Please create it in your repository.`);
            }
        }
        
        let existingFileSha: string | undefined;
        try {
            const fileData = await githubApiRequest(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, installationId);
            if(fileData) existingFileSha = fileData.sha;
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

        await githubApiRequest(`/repos/${owner}/${repo}/contents/${path}`, installationId, {
            method: 'PUT',
            body: JSON.stringify(body),
        });

        console.log(`Successfully committed '${path}' to ${owner}/${repo} on branch ${branch}`);

    } catch (error) {
        console.error('Failed to commit to GitHub repository:', error);
        throw error; // Re-throw to be caught by the calling server action
    }
}

export async function getRepoBranches({ owner, repo, installationId }: GetRepoBranchesParams): Promise<string[]> {
    try {
        const branchesData = await githubApiRequest(`/repos/${owner}/${repo}/branches`, installationId);
        return branchesData.map((branch: any) => branch.name);
    } catch (error) {
        console.error(`Failed to fetch branches for ${owner}/${repo}:`, error);
        return [];
    }
}
