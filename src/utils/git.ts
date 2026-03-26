/**
 * Git operations wrapper using simple-git.
 */
import { simpleGit, type SimpleGit, type LogResult } from 'simple-git';

/**
 * Create a git instance for the given directory.
 */
export function createGit(dir: string): SimpleGit {
  return simpleGit(dir);
}

/**
 * Check if a directory is a git repository.
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    const git = createGit(dir);
    await git.revparse(['--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get recent commits from the repository.
 */
export async function getCommitLog(
  dir: string,
  maxCount: number = 200
): Promise<LogResult> {
  const git = createGit(dir);
  return git.log({ maxCount, '--no-merges': null } as Record<string, unknown>);
}

/**
 * Get files changed in a specific commit.
 */
export async function getCommitFiles(dir: string, hash: string): Promise<string[]> {
  const git = createGit(dir);
  const result = await git.show(['--name-only', '--pretty=format:', hash]);
  return result
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Get the repository name from git remote or directory name.
 */
export async function getRepoName(dir: string): Promise<string> {
  try {
    const git = createGit(dir);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    if (origin?.refs?.fetch) {
      const match = origin.refs.fetch.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) return match[1];
    }
  } catch {
    // Fall through to directory name
  }
  const parts = dir.split('/');
  return parts[parts.length - 1] || 'unknown';
}
