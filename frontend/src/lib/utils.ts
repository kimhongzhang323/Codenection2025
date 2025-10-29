import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A reference to a GitHub repository in the form owner/name
export interface GithubRepoRef {
  owner: string;
  name: string;
}

// Parse a GitHub repository URL into a GithubRepoRef. Returns null if invalid.
export function parseGithubRepoUrl(input: string): GithubRepoRef | null {
  if (!input) return null;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') return null;

    // Split pathname and remove empty segments
    const segments = url.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length < 2) return null;

    const owner = segments[0];
    let name = segments[1];

    // Allow optional .git suffix
    if (name.endsWith('.git')) {
      name = name.slice(0, -4);
    }

    if (!owner || !name) return null;

    return { owner, name };
  } catch {
    return null;
  }
}

// Check via GitHub API whether a repo exists and is public.
// Uses the unauthenticated API; subject to low rate limits.
export async function isPublicGithubRepo(
  repo: GithubRepoRef,
  signal?: AbortSignal,
): Promise<boolean> {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (res.status === 200) {
    try {
      const data = (await res.json()) as { private?: boolean };
      return data?.private === false;
    } catch {
      return false;
    }
  }

  if (res.status === 404) return false;

  // For 403 (rate limit) or other errors, return false conservatively
  return false;
}

// Repository details interface
export interface GithubRepoDetails {
  name: string;
  fullName: string;
  description: string;
  stars: string;
  language?: string;
  topics?: string[];
}

// Fetch repository details from GitHub API
export async function fetchGithubRepoDetails(
  repo: GithubRepoRef,
  signal?: AbortSignal,
): Promise<GithubRepoDetails | null> {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });

    if (res.status !== 200) return null;

    const data = await res.json();
    
    // Format star count
    const starCount = data.stargazers_count || 0;
    const stars = starCount >= 1000 
      ? `${(starCount / 1000).toFixed(1)}k` 
      : starCount.toString();

    return {
      name: `${repo.owner} / ${repo.name}`,
      fullName: data.name || repo.name,
      description: data.description || 'No description available',
      stars,
      language: data.language,
      topics: data.topics || [],
    };
  } catch (error) {
    console.error('Error fetching repo details:', error);
    return null;
  }
}

// Convenience helper: validate URL and check public status
export async function checkGithubUrlPublic(
  input: string,
  signal?: AbortSignal,
): Promise<{ valid: boolean; reason?: string; repo?: GithubRepoRef }> {
  const parsed = parseGithubRepoUrl(input);
  if (!parsed) return { valid: false, reason: 'Invalid GitHub repository URL' };
  const isPublic = await isPublicGithubRepo(parsed, signal);
  return isPublic
    ? { valid: true, repo: parsed }
    : { valid: false, reason: 'Repository does not exist or is not public', repo: parsed };
}
