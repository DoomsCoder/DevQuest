/**
 * Terminal Renderer Service
 * 
 * Produces realistic CLI-style output for Git commands that mimics
 * real Git terminal behavior for educational purposes.
 */

import { GameState, TerminalOutputLine } from '../types';

export interface TerminalOutput {
    raw: string;           // Plain text version
    lines: TerminalOutputLine[];  // Structured version with colors/tooltips
}

// Educational tooltips for Git terminology
const TOOLTIPS = {
    modified: "This file exists in your last commit but has been changed in your working directory. Use 'git add' to stage these changes.",
    staged: "This file is in the staging area and will be included in your next commit.",
    newFile: "This is a new file that has been staged and will be added to the repository in your next commit.",
    untracked: "Git doesn't know about this file yet. Use 'git add' to start tracking it.",
    deleted: "This file has been deleted from your working directory but the deletion hasn't been staged yet.",
    workingDirectory: "Your actual files on disk - the files you edit directly.",
    stagingArea: "A preparation area where you build up changes for your next commit.",
    branch: "A branch is an independent line of development. You can create branches to work on features without affecting the main codebase.",
    upToDate: "Your local branch has the same commits as the remote branch - no push or pull needed.",
    ahead: "Your local branch has commits that haven't been pushed to the remote yet.",
    behind: "The remote branch has commits that you haven't pulled to your local branch yet."
};

/**
 * Renders `git status` output in realistic CLI format
 */
export function renderGitStatus(state: GameState): TerminalOutput {
    const lines: TerminalOutputLine[] = [];
    const rawLines: string[] = [];
    const { git, fileSystem, cwd } = state;

    // ===== BRANCH HEADER =====
    if (git.HEAD.type === 'branch') {
        const branchLine = `On branch ${git.HEAD.ref}`;
        lines.push({ text: branchLine, type: 'header', tooltip: TOOLTIPS.branch });
        rawLines.push(branchLine);

        // Check remote tracking status
        const remoteName = 'origin';
        const remote = git.remotes[remoteName];
        if (remote && remote.branches[git.HEAD.ref]) {
            const localCommitId = git.branches[git.HEAD.ref];
            const remoteCommitId = remote.branches[git.HEAD.ref];

            if (localCommitId === remoteCommitId) {
                const upToDateLine = `Your branch is up to date with '${remoteName}/${git.HEAD.ref}'.`;
                lines.push({ text: upToDateLine, type: 'normal', tooltip: TOOLTIPS.upToDate });
                rawLines.push(upToDateLine);
            } else if (localCommitId && remoteCommitId) {
                // Count commits ahead (simplified - just show as 1 if different)
                const aheadLine = `Your branch is ahead of '${remoteName}/${git.HEAD.ref}' by 1 commit.`;
                lines.push({ text: aheadLine, type: 'normal', tooltip: TOOLTIPS.ahead });
                rawLines.push(aheadLine);
            }
        }
    } else {
        const detachedLine = `HEAD detached at ${git.HEAD.ref.substring(0, 7)}`;
        lines.push({ text: detachedLine, type: 'header' });
        rawLines.push(detachedLine);
    }

    lines.push({ text: '', type: 'normal' });
    rawLines.push('');

    // ===== CHANGES TO BE COMMITTED (Staged) =====
    if (git.staging.length > 0) {
        lines.push({
            text: 'Changes to be committed:',
            type: 'header',
            tooltip: TOOLTIPS.stagingArea
        });
        rawLines.push('Changes to be committed:');

        lines.push({
            text: '  (use "git restore --staged <file>..." to unstage)',
            type: 'hint'
        });
        rawLines.push('  (use "git restore --staged <file>..." to unstage)');

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');

        for (const file of git.staging) {
            // Determine if it's a new file or modified file
            const isNewFile = !git.trackedFiles.includes(file);
            const prefix = isNewFile ? 'new file:' : 'modified:';
            const tooltip = isNewFile ? TOOLTIPS.newFile : TOOLTIPS.staged;

            const fileLine = `        ${prefix.padEnd(12)} ${file}`;
            lines.push({ text: fileLine, type: 'staged', tooltip });
            rawLines.push(fileLine);
        }

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');
    }

    // ===== CHANGES NOT STAGED FOR COMMIT (Modified) =====
    const modifiedFiles = git.workingDirectory?.modified || [];
    const deletedFiles = git.workingDirectory?.deleted || [];

    if (modifiedFiles.length > 0 || deletedFiles.length > 0) {
        lines.push({
            text: 'Changes not staged for commit:',
            type: 'header',
            tooltip: TOOLTIPS.workingDirectory
        });
        rawLines.push('Changes not staged for commit:');

        lines.push({
            text: '  (use "git add <file>..." to update what will be committed)',
            type: 'hint'
        });
        rawLines.push('  (use "git add <file>..." to update what will be committed)');

        lines.push({
            text: '  (use "git restore <file>..." to discard changes in working directory)',
            type: 'hint'
        });
        rawLines.push('  (use "git restore <file>..." to discard changes in working directory)');

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');

        for (const file of modifiedFiles) {
            const fileLine = `        modified:   ${file}`;
            lines.push({ text: fileLine, type: 'modified', tooltip: TOOLTIPS.modified });
            rawLines.push(fileLine);
        }

        for (const file of deletedFiles) {
            const fileLine = `        deleted:    ${file}`;
            lines.push({ text: fileLine, type: 'deleted', tooltip: TOOLTIPS.deleted });
            rawLines.push(fileLine);
        }

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');
    }

    // ===== UNTRACKED FILES =====
    // Get all files in the project directory that aren't tracked or staged
    // Important: We need to match file naming conventions between staging and filesystem

    // Get project root (e.g., 'project')
    const projectKey = Object.keys(fileSystem)[0];
    const projectNode = fileSystem[projectKey];

    // Get files directly in the project directory (matching how staging stores filenames)
    const filesInProject: string[] = [];
    if (projectNode && projectNode.children) {
        const collectFiles = (node: any, prefix: string) => {
            for (const [name, child] of Object.entries(node)) {
                const childNode = child as any;
                if (childNode.type === 'file') {
                    // Store just the filename for files in project root, or relative path for nested
                    filesInProject.push(prefix ? `${prefix}/${name}` : name);
                } else if (childNode.type === 'directory' && childNode.children) {
                    collectFiles(childNode.children, prefix ? `${prefix}/${name}` : name);
                }
            }
        };
        collectFiles(projectNode.children, '');
    }

    // Filter to get untracked files - files that are NOT in staging AND NOT in trackedFiles
    const untrackedFiles = filesInProject.filter(file => {
        const isStaged = git.staging.includes(file);
        const isTracked = git.trackedFiles.includes(file);
        const isModified = git.workingDirectory?.modified?.includes(file) || false;

        // A file is untracked if it's not staged, not tracked, and not in modified
        return !isStaged && !isTracked && !isModified;
    });

    if (untrackedFiles.length > 0) {
        lines.push({
            text: 'Untracked files:',
            type: 'header',
            tooltip: TOOLTIPS.untracked
        });
        rawLines.push('Untracked files:');

        lines.push({
            text: '  (use "git add <file>..." to include in what will be committed)',
            type: 'hint'
        });
        rawLines.push('  (use "git add <file>..." to include in what will be committed)');

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');

        for (const file of untrackedFiles) {
            const fileLine = `        ${file}`;
            lines.push({ text: fileLine, type: 'untracked', tooltip: TOOLTIPS.untracked });
            rawLines.push(fileLine);
        }

        lines.push({ text: '', type: 'normal' });
        rawLines.push('');
    }

    // ===== FINAL STATUS LINE =====
    const hasStaged = git.staging.length > 0;
    const hasUnstaged = modifiedFiles.length > 0 || deletedFiles.length > 0;
    const hasUntracked = untrackedFiles.length > 0;

    if (!hasStaged && !hasUnstaged && !hasUntracked) {
        const cleanLine = 'nothing to commit, working tree clean';
        lines.push({ text: cleanLine, type: 'normal' });
        rawLines.push(cleanLine);
    } else if (!hasStaged && (hasUnstaged || hasUntracked)) {
        const noStagedLine = 'no changes added to commit (use "git add" and/or "git commit -a")';
        lines.push({ text: noStagedLine, type: 'hint' });
        rawLines.push(noStagedLine);
    }

    return {
        raw: rawLines.join('\n'),
        lines
    };
}

/**
 * Renders `git branch` output in realistic CLI format (vertical list)
 */
export function renderGitBranch(state: GameState): TerminalOutput {
    const lines: TerminalOutputLine[] = [];
    const rawLines: string[] = [];
    const { git } = state;

    const currentBranch = git.HEAD.type === 'branch' ? git.HEAD.ref : null;

    // Sort branches alphabetically
    const branchNames = Object.keys(git.branches).sort();

    for (const branch of branchNames) {
        if (branch === currentBranch) {
            const branchLine = `* ${branch}`;
            lines.push({
                text: branchLine,
                type: 'branch-current',
                tooltip: 'This is your currently active branch'
            });
            rawLines.push(branchLine);
        } else {
            const branchLine = `  ${branch}`;
            lines.push({
                text: branchLine,
                type: 'branch',
                tooltip: TOOLTIPS.branch
            });
            rawLines.push(branchLine);
        }
    }

    return {
        raw: rawLines.join('\n'),
        lines
    };
}

/**
 * Renders `git log` output in realistic CLI format
 */
export function renderGitLog(state: GameState, options: { oneline?: boolean; limit?: number }): TerminalOutput {
    const lines: TerminalOutputLine[] = [];
    const rawLines: string[] = [];
    const { git } = state;

    const limit = options.limit || 5;
    const commits = git.commits.slice(-limit).reverse();

    if (commits.length === 0) {
        const emptyLine = 'fatal: your current branch does not have any commits yet';
        lines.push({ text: emptyLine, type: 'normal' });
        rawLines.push(emptyLine);
        return { raw: rawLines.join('\n'), lines };
    }

    if (options.oneline) {
        for (const commit of commits) {
            const commitLine = `${commit.id} ${commit.message}`;
            lines.push({ text: commitLine, type: 'normal' });
            rawLines.push(commitLine);
        }
    } else {
        for (const commit of commits) {
            const date = new Date(commit.timestamp);

            lines.push({ text: `commit ${commit.id}`, type: 'header' });
            rawLines.push(`commit ${commit.id}`);

            lines.push({ text: `Author: ${commit.author}`, type: 'normal' });
            rawLines.push(`Author: ${commit.author}`);

            lines.push({ text: `Date:   ${date.toLocaleString()}`, type: 'normal' });
            rawLines.push(`Date:   ${date.toLocaleString()}`);

            lines.push({ text: '', type: 'normal' });
            rawLines.push('');

            lines.push({ text: `    ${commit.message}`, type: 'normal' });
            rawLines.push(`    ${commit.message}`);

            lines.push({ text: '', type: 'normal' });
            rawLines.push('');
        }
    }

    return {
        raw: rawLines.join('\n'),
        lines
    };
}

/**
 * Helper function to get all file paths from the file system
 */
function getAllFilePaths(fs: { [key: string]: any }, basePath: string): string[] {
    const files: string[] = [];

    for (const [name, node] of Object.entries(fs)) {
        if (node.type === 'file') {
            files.push(basePath ? `${basePath}/${name}` : name);
        } else if (node.type === 'directory' && node.children) {
            const childPath = basePath ? `${basePath}/${name}` : name;
            files.push(...getAllFilePaths(node.children, childPath));
        }
    }

    return files;
}

/**
 * Get file paths relative to the project root from cwd
 */
export function getFilesInProjectRoot(state: GameState): string[] {
    const { fileSystem } = state;

    // Get the project directory (first key in fileSystem)
    const projectKey = Object.keys(fileSystem)[0];
    if (!projectKey || !fileSystem[projectKey].children) {
        return [];
    }

    return getAllFilePaths(fileSystem[projectKey].children, '');
}
