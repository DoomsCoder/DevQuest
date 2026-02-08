import { GameState, FileNode, GitState, Commit, TerminalOutputLine } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { renderGitStatus, renderGitBranch, renderGitLog, TerminalOutput } from './terminalRenderer';

export const INITIAL_STATE: GameState = {
    cwd: '/project',
    commandHistory: [],
    envVariables: {},
    fileSystem: {
        'project': {
            type: 'directory',
            name: 'project',
            children: {
                'readme.md': { type: 'file', name: 'readme.md', content: '# My Project' }
            }
        }
    },
    git: {
        commits: [],
        branches: { 'main': '' },
        HEAD: { type: 'branch', ref: 'main' },
        staging: [],
        repoInitialized: false,
        remotes: {},
        workingDirectory: {
            modified: [],
            deleted: []
        },
        trackedFiles: []
    }
};

const resolvePath = (fs: { [key: string]: FileNode }, path: string, cwd: string): { parent: FileNode | null, node: FileNode | null, name: string } => {
    if (!path) return { parent: null, node: null, name: '' };
    if (path === '/') return { parent: null, node: { type: 'directory', name: 'root', children: fs }, name: 'root' };

    const parts = path.startsWith('/')
        ? path.split('/').filter(Boolean)
        : `${cwd}/${path}`.split('/').filter(Boolean);

    let current: FileNode | undefined = { type: 'directory', name: 'root', children: fs };
    let parent: FileNode | null = null;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '.') continue;
        if (part === '..') { continue; }

        if (current && current.children && current.children[part]) {
            parent = current;
            current = current.children[part];
        } else {
            if (i === parts.length - 1) return { parent: current || null, node: null, name: part };
            return { parent: null, node: null, name: part };
        }
    }
    return { parent, node: current || null, name: parts[parts.length - 1] || 'root' };
};

// Helper to get all ancestors of a commit
const getAncestors = (commitId: string, allCommits: Commit[]): string[] => {
    const ancestors = new Set<string>();
    const stack = [commitId];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current && !ancestors.has(current)) {
            ancestors.add(current);
            const commit = allCommits.find(c => c.id === current);
            if (commit) {
                if (commit.parentId) stack.push(commit.parentId);
                if (commit.mergeParentId) stack.push(commit.mergeParentId);
            }
        }
    }
    return Array.from(ancestors);
};

// Helper for 'ls -l'
const formatLongListing = (node: FileNode, name: string): string => {
    const perms = node.permissions || (node.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
    const links = node.type === 'directory' ? 2 : 1;
    const owner = node.owner || 'user';
    const group = node.group || 'staff';
    const size = node.size ?? (node.type === 'file' ? (node.content?.length || 0) : 4096);

    const date = new Date(node.modified || Date.now());
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate().toString().padStart(2, ' ');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    const sizeStr = size.toString().padStart(5, ' ');

    return `${perms.padEnd(10)} ${links} ${owner.padEnd(8)} ${group.padEnd(8)} ${sizeStr} ${month} ${day} ${time} ${name}`;
};

// Extended return type to support structured git output
interface CommandResult {
    output: string;
    type: 'success' | 'error' | 'info' | 'git-status' | 'git-branch';
    newState: GameState;
    structured?: { lines: TerminalOutputLine[] };
}

const runSingleCommand = (cmd: string, state: GameState): CommandResult => {
    if (cmd.includes('->')) {
        return { output: 'Invalid command format. Execute commands step-by-step.', type: 'error', newState: state };
    }

    const pipeParts = cmd.split('|');
    const primaryCmd = pipeParts[0].trim();
    // Regex to handle quotes (e.g. echo "hello world")
    const args = primaryCmd.match(/[^\s"]+|"([^"]*)"/g)?.map(a => a.replace(/^"|"$/g, '')) || [];

    if (args.length === 0) return { output: '', type: 'success', newState: state };

    const command = args[0];
    const newState = JSON.parse(JSON.stringify(state)) as GameState;

    const formatOutput = (text: string, type: 'success' | 'error' | 'info'): { output: string, type: 'success' | 'error' | 'info', newState: GameState } => {
        let finalOutput = text;

        // Handle Grep Pipe
        if (pipeParts.length > 1 && type !== 'error') {
            const secondaryParts = pipeParts[1].trim().split(/\s+/);
            if (secondaryParts[0] === 'grep') {
                const search = secondaryParts[1]?.replace(/"/g, '');
                if (search) {
                    finalOutput = text.split('\n').filter(l => l.includes(search)).join('\n');
                }
            }
        }

        // Handle Redirect > or >>
        const redirectIndex = args.indexOf('>');
        const appendIndex = args.indexOf('>>');

        const isRedirect = redirectIndex !== -1;
        const isAppend = appendIndex !== -1;

        if (isRedirect || isAppend) {
            const fileIndex = isRedirect ? redirectIndex + 1 : appendIndex + 1;
            const targetFile = args[fileIndex];
            if (targetFile) {
                const { parent, node, name } = resolvePath(newState.fileSystem, targetFile, newState.cwd);

                if (node && node.type === 'directory') {
                    // Error: cannot redirect to a directory. Silently fail.
                } else if (node && node.type === 'file') {
                    // Overwrite or append existing file
                    node.content = isAppend ? (node.content || '') + '\n' + finalOutput : finalOutput;
                    node.size = node.content.length;
                    node.modified = Date.now();
                    return { output: '', type: 'success', newState };
                } else if (parent && parent.children) {
                    // Create new file
                    parent.children[name] = {
                        type: 'file',
                        name,
                        content: finalOutput,
                        permissions: '-rw-r--r--',
                        owner: 'user',
                        group: 'staff',
                        size: finalOutput.length,
                        modified: Date.now()
                    };
                    return { output: '', type: 'success', newState };
                }
            }
        }

        newState.lastCommandOutput = finalOutput;
        return { output: finalOutput, type, newState };
    };

    // --- BASH & FILESYSTEM COMMANDS ---

    if (command === 'echo') {
        // Check for file redirection
        const redirectOverwrite = args.indexOf('>');
        const redirectAppend = args.indexOf('>>');
        const hasRedirect = redirectOverwrite !== -1 || redirectAppend !== -1;

        // Construct message from args, stopping at redirects
        let parts = [];
        let redirectIndex = -1;

        for (let i = 1; i < args.length; i++) {
            if (args[i] === '>' || args[i] === '>>') {
                redirectIndex = i;
                break;
            }
            parts.push(args[i]);
        }

        // Remove surrounding quotes from the message
        let message = parts.join(' ');
        if ((message.startsWith('"') && message.endsWith('"')) ||
            (message.startsWith("'") && message.endsWith("'"))) {
            message = message.slice(1, -1);
        }

        // Handle file redirection
        if (hasRedirect && redirectIndex !== -1) {
            const isAppend = args[redirectIndex] === '>>';
            const fileName = args[redirectIndex + 1];

            if (!fileName) {
                return formatOutput('bash: syntax error near unexpected token `newline\'', 'error');
            }

            const { parent, node, name } = resolvePath(newState.fileSystem, fileName, newState.cwd);

            if (parent && parent.children) {
                if (node && node.type === 'file') {
                    // File exists - overwrite or append
                    if (isAppend) {
                        node.content = (node.content || '') + (node.content ? '\n' : '') + message;
                    } else {
                        node.content = message;
                    }
                    node.size = (node.content || '').length;
                    node.modified = Date.now();
                } else if (!node) {
                    // Create new file
                    parent.children[name] = {
                        type: 'file',
                        name,
                        content: message,
                        permissions: '-rw-r--r--',
                        owner: 'user',
                        group: 'staff',
                        size: message.length,
                        modified: Date.now()
                    };
                } else {
                    return formatOutput(`bash: ${fileName}: Is a directory`, 'error');
                }
                return { output: '', type: 'success', newState };
            }
            return formatOutput(`bash: ${fileName}: No such file or directory`, 'error');
        }

        // No redirection - just output the message
        return formatOutput(message, 'success');
    }

    if (command === 'cat') {
        const target = args[1];
        if (!target) return formatOutput('cat: missing operand', 'error');
        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
        if (!node) return formatOutput(`cat: ${target}: No such file or directory`, 'error');
        if (node.type === 'directory') return formatOutput(`cat: ${target}: Is a directory`, 'error');
        return formatOutput(node.content || '', 'success');
    }

    if (command === 'vim') {
        const target = args[1];
        if (!target) return formatOutput('vim: missing operand', 'error');

        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);

        let content = '';
        if (node) {
            if (node.type === 'directory') return formatOutput(`vim: ${target}: Is a directory`, 'error');
            content = node.content || '';
        }

        // Set Editor State
        newState.activeEditor = { file: target, content };
        return { output: '', type: 'success', newState };
    }

    if (command === 'export') {
        const pair = args[1];
        // Handle format KEY=VALUE
        if (!pair || !pair.includes('=')) return formatOutput('export: invalid format. Use KEY=VALUE', 'error');

        const eqIdx = pair.indexOf('=');
        const key = pair.substring(0, eqIdx);
        let val = pair.substring(eqIdx + 1);

        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }

        newState.envVariables[key] = val;
        return formatOutput('', 'success');
    }

    // Existing Bash commands
    if (['ls', 'cd', 'mkdir', 'touch', 'rm', 'pwd'].includes(command)) {
        if (command === 'pwd') return formatOutput(newState.cwd, 'success');

        if (command === 'ls') {
            const hasLongFlag = args.includes('-l');
            const target = args.find(a => !a.startsWith('-') && a !== 'ls') || '.';

            const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (!node) return formatOutput(`ls: cannot access '${target}': No such file or directory`, 'error');

            if (node.type === 'file') {
                const output = hasLongFlag ? formatLongListing(node, node.name) : node.name;
                return formatOutput(output, 'info');
            }

            if (node.children) {
                if (!hasLongFlag) {
                    const contents = Object.keys(node.children).sort().join('  ');
                    return formatOutput(contents, 'success');
                } else {
                    const total = Object.keys(node.children).length;
                    const listings = Object.entries(node.children)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([name, childNode]) => formatLongListing(childNode, name))
                        .join('\n');
                    const output = `total ${total}\n${listings}`;
                    return formatOutput(output, 'success');
                }
            }

            return formatOutput('', 'success');
        }

        if (command === 'cd') {
            const target = args[1];
            if (!target) return formatOutput('', 'success');
            const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (!node || node.type !== 'directory') return formatOutput(`cd: ${target}: No such file or directory`, 'error');

            let newPath = newState.cwd;
            if (target.startsWith('/')) newPath = target;
            else {
                const parts = target.split('/');
                for (const p of parts) {
                    if (p === '..') {
                        const arr = newPath.split('/').filter(Boolean);
                        arr.pop();
                        newPath = '/' + arr.join('/');
                    } else if (p !== '.') {
                        newPath = newPath === '/' ? `/${p}` : `${newPath}/${p}`;
                    }
                }
            }
            newState.cwd = newPath || '/';
            return formatOutput('', 'success');
        }

        if (command === 'mkdir') {
            const target = args[1];
            if (!target) return formatOutput('mkdir: missing operand', 'error');
            const { parent, node, name } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (node) return formatOutput(`mkdir: cannot create directory '${target}': File exists`, 'error');
            if (parent && parent.children) {
                parent.children[name] = {
                    type: 'directory',
                    name,
                    children: {},
                    permissions: 'drwxr-xr-x',
                    owner: 'user',
                    group: 'staff',
                    size: 4096,
                    modified: Date.now()
                };
                return formatOutput('', 'success');
            }
            return formatOutput(`mkdir: cannot create directory '${target}': No such file or directory`, 'error');
        }

        if (command === 'touch') {
            const target = args[1];
            if (!target) return formatOutput('touch: missing operand', 'error');
            const { parent, node, name } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (node) {
                node.modified = Date.now();
                return formatOutput('', 'success');
            }
            if (parent && parent.children) {
                parent.children[name] = {
                    type: 'file',
                    name,
                    content: '',
                    permissions: '-rw-r--r--',
                    owner: 'user',
                    group: 'staff',
                    size: 0,
                    modified: Date.now()
                };
                return formatOutput('', 'success');
            }
            return formatOutput(`touch: cannot touch '${target}': No such file or directory`, 'error');
        }

        if (command === 'rm') {
            const target = args.find(a => !a.startsWith('-'));
            if (!target) return formatOutput('rm: missing operand', 'error');
            const { parent, node, name } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (!node) return formatOutput(`rm: cannot remove '${target}': No such file or directory`, 'error');
            if (node.type === 'directory' && !args.includes('-rf') && !args.includes('-r')) {
                return formatOutput(`rm: cannot remove '${target}': Is a directory`, 'error');
            }
            if (parent && parent.children) {
                delete parent.children[name];
                return formatOutput('', 'success');
            }
            return formatOutput('rm: unknown error', 'error');
        }
    }

    // GREP - search file contents
    if (command === 'grep') {
        const pattern = args[1];
        const target = args[2];

        if (!pattern) return formatOutput('grep: missing pattern', 'error');

        // If target is provided, search that file
        if (target) {
            const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
            if (!node) return formatOutput(`grep: ${target}: No such file or directory`, 'error');
            if (node.type === 'directory') return formatOutput(`grep: ${target}: Is a directory`, 'error');

            const content = node.content || '';
            const matches = content.split('\n').filter(line => line.includes(pattern));

            if (matches.length === 0) return formatOutput('', 'success');
            return formatOutput(matches.join('\n'), 'success');
        }

        // If no target, read from pipe (lastCommandOutput)
        if (newState.lastCommandOutput) {
            const matches = newState.lastCommandOutput.split('\n').filter(line => line.includes(pattern));
            return formatOutput(matches.join('\n'), 'success');
        }

        return formatOutput('grep: no input file specified', 'error');
    }

    // FIND - search for files
    if (command === 'find') {
        const searchPath = args[1] || '.';
        const nameFlag = args.indexOf('-name');
        const pattern = nameFlag !== -1 ? args[nameFlag + 1]?.replace(/"/g, '') : null;

        const { node } = resolvePath(newState.fileSystem, searchPath, newState.cwd);
        if (!node) return formatOutput(`find: '${searchPath}': No such file or directory`, 'error');

        const results: string[] = [];

        const searchRecursive = (currentNode: FileNode, path: string) => {
            if (currentNode.children) {
                Object.entries(currentNode.children).forEach(([name, child]) => {
                    const childPath = path === '.' ? `./${name}` : `${path}/${name}`;

                    // Simple glob matching for * wildcard
                    if (!pattern ||
                        name === pattern ||
                        (pattern.includes('*') && new RegExp('^' + pattern.replace(/\*/g, '.*') + '$').test(name))) {
                        results.push(childPath);
                    }

                    if (child.type === 'directory') {
                        searchRecursive(child, childPath);
                    }
                });
            }
        };

        searchRecursive(node, searchPath);
        return formatOutput(results.join('\n') || searchPath, 'success');
    }

    // CHMOD - change file permissions
    if (command === 'chmod') {
        const mode = args[1];
        const target = args[2];

        if (!mode || !target) return formatOutput('chmod: missing operand', 'error');

        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
        if (!node) return formatOutput(`chmod: cannot access '${target}': No such file or directory`, 'error');

        // Convert numeric mode to symbolic (simplified)
        if (/^\d{3,4}$/.test(mode)) {
            const modeNum = mode.slice(-3);
            const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
            const prefix = node.type === 'directory' ? 'd' : '-';
            node.permissions = prefix +
                perms[parseInt(modeNum[0])] +
                perms[parseInt(modeNum[1])] +
                perms[parseInt(modeNum[2])];
        } else if (mode === '+x') {
            // Simple +x handling
            const current = node.permissions || (node.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
            node.permissions = current.slice(0, 3) + 'x' + current.slice(4);
        }

        node.modified = Date.now();
        return formatOutput('', 'success');
    }

    // HEAD - output first lines of file
    if (command === 'head') {
        const nFlag = args.indexOf('-n');
        const lines = nFlag !== -1 ? parseInt(args[nFlag + 1]) || 10 : 10;
        const target = args.find(a => !a.startsWith('-') && a !== 'head' && !/^\d+$/.test(a));

        if (!target) return formatOutput('head: missing file operand', 'error');

        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
        if (!node) return formatOutput(`head: ${target}: No such file or directory`, 'error');
        if (node.type === 'directory') return formatOutput(`head: ${target}: Is a directory`, 'error');

        const content = (node.content || '').split('\n').slice(0, lines).join('\n');
        return formatOutput(content, 'success');
    }

    // TAIL - output last lines of file
    if (command === 'tail') {
        const nFlag = args.indexOf('-n');
        const lines = nFlag !== -1 ? parseInt(args[nFlag + 1]) || 10 : 10;
        const target = args.find(a => !a.startsWith('-') && a !== 'tail' && !/^\d+$/.test(a));

        if (!target) return formatOutput('tail: missing file operand', 'error');

        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
        if (!node) return formatOutput(`tail: ${target}: No such file or directory`, 'error');
        if (node.type === 'directory') return formatOutput(`tail: ${target}: Is a directory`, 'error');

        const allLines = (node.content || '').split('\n');
        const content = allLines.slice(-lines).join('\n');
        return formatOutput(content, 'success');
    }

    // WC - word count
    if (command === 'wc') {
        const hasL = args.includes('-l');
        const hasW = args.includes('-w');
        const target = args.find(a => !a.startsWith('-') && a !== 'wc');

        if (!target) return formatOutput('wc: missing file operand', 'error');

        const { node } = resolvePath(newState.fileSystem, target, newState.cwd);
        if (!node) return formatOutput(`wc: ${target}: No such file or directory`, 'error');
        if (node.type === 'directory') return formatOutput(`wc: ${target}: Is a directory`, 'error');

        const content = node.content || '';
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(Boolean).length;
        const chars = content.length;

        if (hasL) return formatOutput(`${lines} ${target}`, 'success');
        if (hasW) return formatOutput(`${words} ${target}`, 'success');
        return formatOutput(`${lines} ${words} ${chars} ${target}`, 'success');
    }

    // CLEAR - clear terminal (handled in Terminal component, but echo empty)
    if (command === 'clear') {
        return formatOutput('\x1Bc', 'success'); // ANSI escape to clear
    }

    // WHOAMI
    if (command === 'whoami') {
        return formatOutput('user', 'success');
    }

    // HOSTNAME
    if (command === 'hostname') {
        return formatOutput('devquest-vm', 'success');
    }

    // DATE
    if (command === 'date') {
        return formatOutput(new Date().toString(), 'success');
    }

    // --- GIT COMMANDS ---
    if (command === 'git') {
        const subCmd = args[1];
        if (!subCmd) return formatOutput('usage: git <command>', 'info');

        // INIT
        if (subCmd === 'init') {
            newState.git.repoInitialized = true;
            return formatOutput('Initialized empty Git repository', 'success');
        }

        if (!newState.git.repoInitialized) {
            return formatOutput('fatal: not a git repository', 'error');
        }

        // REMOTE
        if (subCmd === 'remote') {
            if (args[2] === 'add' && args[3]) {
                const remoteName = args[3];
                const url = args[4] || 'https://github.com/user/repo.git';
                newState.git.remotes[remoteName] = { url, commits: [], branches: {} };
                return formatOutput('', 'success');
            }
            if (args[2] === '-v') {
                const remotes = Object.entries(newState.git.remotes)
                    .map(([name, r]) => `${name}\t${r.url} (fetch)\n${name}\t${r.url} (push)`)
                    .join('\n');
                return formatOutput(remotes, 'success');
            }
        }

        // STATUS - Realistic CLI output
        if (subCmd === 'status') {
            // Ensure workingDirectory exists
            if (!newState.git.workingDirectory) {
                newState.git.workingDirectory = { modified: [], deleted: [] };
            }
            if (!newState.git.trackedFiles) {
                newState.git.trackedFiles = [];
            }

            const result = renderGitStatus(newState);
            return {
                output: result.raw,
                type: 'git-status',
                newState,
                structured: { lines: result.lines }
            };
        }

        // ADD
        if (subCmd === 'add') {
            // Ensure workingDirectory exists
            if (!newState.git.workingDirectory) {
                newState.git.workingDirectory = { modified: [], deleted: [] };
            }

            const files = args.slice(2);
            if (files.includes('.')) {
                const { node } = resolvePath(newState.fileSystem, '.', newState.cwd);
                if (node && node.children) {
                    const names = Object.keys(node.children).filter(k => node.children![k].type === 'file');
                    newState.git.staging = [...new Set([...newState.git.staging, ...names])];
                    // Remove added files from workingDirectory.modified
                    newState.git.workingDirectory.modified = newState.git.workingDirectory.modified.filter(
                        f => !names.includes(f)
                    );
                }
            } else {
                files.forEach(f => {
                    const { node } = resolvePath(newState.fileSystem, f, newState.cwd);
                    if (node && node.type === 'file') {
                        newState.git.staging = [...new Set([...newState.git.staging, f])];
                        // Remove from workingDirectory.modified
                        newState.git.workingDirectory.modified = newState.git.workingDirectory.modified.filter(
                            file => file !== f
                        );
                    }
                });
            }
            return formatOutput('', 'success');
        }

        // COMMIT
        if (subCmd === 'commit') {
            // Ensure trackedFiles exists
            if (!newState.git.trackedFiles) {
                newState.git.trackedFiles = [];
            }

            const mIndex = args.indexOf('-m');
            if (mIndex === -1 || !args[mIndex + 1]) return formatOutput('error: switch `m` requires a value', 'error');
            if (newState.git.staging.length === 0) return formatOutput('nothing to commit, working tree clean', 'info');

            const msg = args[mIndex + 1];
            const newId = uuidv4().substring(0, 7);
            const parentId = newState.git.HEAD.type === 'branch'
                ? newState.git.branches[newState.git.HEAD.ref] || null
                : newState.git.HEAD.ref;

            const commit: Commit = {
                id: newId,
                message: msg,
                parentId,
                timestamp: Date.now(),
                author: 'User',
                treeSnapshot: JSON.stringify(newState.fileSystem)
            };

            // Add staged files to trackedFiles
            newState.git.trackedFiles = [...new Set([...newState.git.trackedFiles, ...newState.git.staging])];

            newState.git.commits.push(commit);
            newState.git.staging = [];

            if (newState.git.HEAD.type === 'branch') {
                newState.git.branches[newState.git.HEAD.ref] = newId;
            } else {
                newState.git.HEAD.ref = newId;
            }
            return formatOutput(`[${newState.git.HEAD.ref} ${newId}] ${msg}`, 'success');
        }

        // BRANCH - Realistic CLI output
        if (subCmd === 'branch') {
            // git branch -M main (rename)
            if (args[2] === '-M' && args[3]) {
                const oldName = newState.git.HEAD.ref;
                const newName = args[3];
                if (newState.git.HEAD.type === 'branch') {
                    newState.git.branches[newName] = newState.git.branches[oldName];
                    delete newState.git.branches[oldName];
                    newState.git.HEAD.ref = newName;
                    return formatOutput('', 'success');
                }
            }

            // git branch -d <name> (delete)
            if (args[2] === '-d' && args[3]) {
                const branchToDelete = args[3];
                if (!newState.git.branches[branchToDelete]) {
                    return formatOutput(`error: branch '${branchToDelete}' not found.`, 'error');
                }
                if (newState.git.HEAD.type === 'branch' && newState.git.HEAD.ref === branchToDelete) {
                    return formatOutput(`error: Cannot delete branch '${branchToDelete}' checked out.`, 'error');
                }
                delete newState.git.branches[branchToDelete];
                return formatOutput(`Deleted branch ${branchToDelete}`, 'success');
            }

            // git branch <name> (create new branch)
            const name = args[2];
            if (!name) {
                // List branches with realistic output
                const result = renderGitBranch(newState);
                return {
                    output: result.raw,
                    type: 'git-branch',
                    newState,
                    structured: { lines: result.lines }
                };
            }

            if (newState.git.branches[name]) {
                return formatOutput(`fatal: A branch named '${name}' already exists.`, 'error');
            }

            const headCommit = newState.git.HEAD.type === 'branch'
                ? newState.git.branches[newState.git.HEAD.ref]
                : newState.git.HEAD.ref;
            newState.git.branches[name] = headCommit || ''; // Empty string if no commits yet
            return formatOutput('', 'success');
        }

        // CHECKOUT & SWITCH
        if (subCmd === 'checkout' || subCmd === 'switch') {
            const isSwitch = subCmd === 'switch';
            let target = args[2];
            let createBranch = false;

            if (target === '-b' || (isSwitch && target === '-c')) {
                createBranch = true;
                target = args[3];
            }

            if (createBranch) {
                if (newState.git.branches[target]) return formatOutput(`fatal: A branch named '${target}' already exists.`, 'error');
                const headCommit = newState.git.HEAD.type === 'branch'
                    ? newState.git.branches[newState.git.HEAD.ref]
                    : newState.git.HEAD.ref;
                newState.git.branches[target] = headCommit;
                newState.git.HEAD = { type: 'branch', ref: target };
                return formatOutput(`Switched to a new branch '${target}'`, 'success');
            }

            // Normal Checkout
            if (newState.git.branches[target] !== undefined) {
                newState.git.HEAD = { type: 'branch', ref: target };
                // Restore FileSystem State
                const cid = newState.git.branches[target];
                if (cid) {
                    const c = newState.git.commits.find(x => x.id === cid);
                    if (c) newState.fileSystem = JSON.parse(c.treeSnapshot);
                }
                return formatOutput(`Switched to branch '${target}'`, 'success');
            }
            return formatOutput(`error: pathspec '${target}' did not match any file(s) known to git`, 'error');
        }

        // MERGE (The Hydra Fix)
        if (subCmd === 'merge') {
            const targetBranch = args[2];
            if (!targetBranch) return formatOutput('merge: missing operand', 'error');
            if (!newState.git.branches[targetBranch]) return formatOutput(`merge: ${targetBranch} - not something we can merge`, 'error');

            const currentBranch = newState.git.HEAD.ref;
            const currentCommitId = newState.git.branches[currentBranch];
            const targetCommitId = newState.git.branches[targetBranch];

            if (!currentCommitId || !targetCommitId) return formatOutput('Nothing to merge.', 'info');
            if (currentCommitId === targetCommitId) return formatOutput('Already up to date.', 'success');

            // Simulate Merge Commit
            const newId = uuidv4().substring(0, 7);
            const msg = `Merge branch '${targetBranch}' into ${currentBranch}`;

            const mergeCommit: Commit = {
                id: newId,
                message: msg,
                parentId: currentCommitId,
                mergeParentId: targetCommitId, // Critical for visual graph
                timestamp: Date.now(),
                author: 'User',
                treeSnapshot: JSON.stringify(newState.fileSystem) // Simplified: assume FS is result of merge
            };

            newState.git.commits.push(mergeCommit);
            newState.git.branches[currentBranch] = newId;
            return formatOutput(`Merge made by the 'ort' strategy.`, 'success');
        }

        // PUSH (Cloud Uplink)
        if (subCmd === 'push') {
            let remoteName = args[2];
            let branchName = args[3];

            if (remoteName === '-u') {
                remoteName = args[3];
                branchName = args[4];
            } else if (!branchName) { // Handles 'git push origin'
                branchName = remoteName;
                remoteName = 'origin';
            }

            if (!remoteName || !newState.git.remotes[remoteName]) {
                return formatOutput(`fatal: '${remoteName}' does not appear to be a git repository`, 'error');
            }

            if (!branchName) branchName = newState.git.HEAD.ref;

            const remote = newState.git.remotes[remoteName];
            const localCommitId = newState.git.branches[branchName];

            if (!localCommitId) {
                return formatOutput(`error: src refspec ${branchName} does not match any.`, 'error');
            }

            const ancestors = getAncestors(localCommitId, newState.git.commits);

            ancestors.forEach(aid => {
                if (!remote.commits.find(c => c.id === aid)) {
                    const commitToAdd = newState.git.commits.find(c => c.id === aid);
                    if (commitToAdd) remote.commits.push(JSON.parse(JSON.stringify(commitToAdd)));
                }
            });

            remote.branches[branchName] = localCommitId;

            return formatOutput(`To ${remote.url}\n * [new branch]      ${branchName} -> ${branchName}`, 'success');
        }

        // STASH
        if (subCmd === 'stash') {
            const subSubCmd = args[2];

            // Initialize stash array if it doesn't exist
            if (!newState.git.stash) newState.git.stash = [];

            if (!subSubCmd || subSubCmd === 'push') {
                // Stash current changes (staging area and modified files)
                if (newState.git.staging.length === 0) {
                    return formatOutput('No local changes to save', 'info');
                }

                const stashEntry = {
                    id: uuidv4().substring(0, 7),
                    staging: [...newState.git.staging],
                    fileSnapshot: JSON.stringify(newState.fileSystem),
                    message: args[3] || `WIP on ${newState.git.HEAD.ref}`,
                    timestamp: Date.now()
                };

                newState.git.stash.push(stashEntry);
                newState.git.staging = [];

                return formatOutput(`Saved working directory and index state "${stashEntry.message}"`, 'success');
            }

            if (subSubCmd === 'pop' || subSubCmd === 'apply') {
                if (newState.git.stash.length === 0) {
                    return formatOutput('No stash entries found.', 'error');
                }

                const entry = subSubCmd === 'pop'
                    ? newState.git.stash.pop()
                    : newState.git.stash[newState.git.stash.length - 1];

                if (entry) {
                    newState.git.staging = entry.staging;
                    newState.fileSystem = JSON.parse(entry.fileSnapshot);
                    return formatOutput(`Applied stash: ${entry.message}`, 'success');
                }
            }

            if (subSubCmd === 'list') {
                if (newState.git.stash.length === 0) {
                    return formatOutput('', 'success');
                }
                const list = newState.git.stash.map((s, i) =>
                    `stash@{${i}}: ${s.message}`
                ).join('\n');
                return formatOutput(list, 'info');
            }

            if (subSubCmd === 'clear') {
                newState.git.stash = [];
                return formatOutput('', 'success');
            }

            return formatOutput(`Usage: git stash [push|pop|apply|list|clear]`, 'info');
        }

        // RESET
        if (subCmd === 'reset') {
            const mode = args[2];
            let targetRef = args[3];

            // Handle: git reset --hard HEAD~1 or git reset --soft HEAD~1
            if (mode === '--hard' || mode === '--soft' || mode === '--mixed') {
                if (!targetRef) targetRef = 'HEAD';

                // Parse HEAD~N syntax
                let stepsBack = 0;
                if (targetRef.includes('~')) {
                    const parts = targetRef.split('~');
                    stepsBack = parseInt(parts[1]) || 1;
                    targetRef = parts[0];
                }

                // Find target commit
                let targetCommitId: string | null = null;
                if (targetRef === 'HEAD') {
                    targetCommitId = newState.git.HEAD.type === 'branch'
                        ? newState.git.branches[newState.git.HEAD.ref]
                        : newState.git.HEAD.ref;
                } else {
                    // Look up by branch name or commit id
                    targetCommitId = newState.git.branches[targetRef] || targetRef;
                }

                // Walk back N commits
                for (let i = 0; i < stepsBack && targetCommitId; i++) {
                    const commit = newState.git.commits.find(c => c.id === targetCommitId);
                    if (commit && commit.parentId) {
                        targetCommitId = commit.parentId;
                    }
                }

                if (!targetCommitId) {
                    return formatOutput(`fatal: Failed to resolve '${args[3] || 'HEAD'}' as a valid ref.`, 'error');
                }

                // Update branch pointer
                if (newState.git.HEAD.type === 'branch') {
                    newState.git.branches[newState.git.HEAD.ref] = targetCommitId;
                } else {
                    newState.git.HEAD.ref = targetCommitId;
                }

                // Hard reset: also restore working directory
                if (mode === '--hard') {
                    const targetCommit = newState.git.commits.find(c => c.id === targetCommitId);
                    if (targetCommit) {
                        newState.fileSystem = JSON.parse(targetCommit.treeSnapshot);
                    }
                    newState.git.staging = [];
                    return formatOutput(`HEAD is now at ${targetCommitId}`, 'success');
                }

                // Soft reset: keep staging and working directory
                if (mode === '--soft') {
                    return formatOutput(`HEAD is now at ${targetCommitId}`, 'success');
                }

                // Mixed (default): unstage but keep working directory
                newState.git.staging = [];
                return formatOutput(`Unstaged changes after reset:\nM\tfiles...`, 'success');
            }

            // Simple reset (unstage)
            if (mode && !mode.startsWith('-')) {
                // git reset <file> - unstage a file
                newState.git.staging = newState.git.staging.filter(f => f !== mode);
                return formatOutput('', 'success');
            }

            // git reset with no args - unstage all
            newState.git.staging = [];
            return formatOutput('', 'success');
        }

        // REVERT
        if (subCmd === 'revert') {
            const targetRef = args[2];
            if (!targetRef) return formatOutput('error: missing commit to revert', 'error');

            // Find the commit to revert
            const commitToRevert = newState.git.commits.find(c => c.id === targetRef || c.id.startsWith(targetRef));
            if (!commitToRevert) {
                return formatOutput(`fatal: bad revision '${targetRef}'`, 'error');
            }

            // Create a new revert commit
            const newId = uuidv4().substring(0, 7);
            const msg = `Revert "${commitToRevert.message}"`;

            const parentId = newState.git.HEAD.type === 'branch'
                ? newState.git.branches[newState.git.HEAD.ref]
                : newState.git.HEAD.ref;

            // For simulation: revert to parent's state if available
            let revertedSnapshot = JSON.stringify(newState.fileSystem);
            if (commitToRevert.parentId) {
                const parentCommit = newState.git.commits.find(c => c.id === commitToRevert.parentId);
                if (parentCommit) {
                    revertedSnapshot = parentCommit.treeSnapshot;
                    newState.fileSystem = JSON.parse(revertedSnapshot);
                }
            }

            const revertCommit: Commit = {
                id: newId,
                message: msg,
                parentId,
                timestamp: Date.now(),
                author: 'User',
                treeSnapshot: revertedSnapshot
            };

            newState.git.commits.push(revertCommit);

            if (newState.git.HEAD.type === 'branch') {
                newState.git.branches[newState.git.HEAD.ref] = newId;
            }

            return formatOutput(`[${newState.git.HEAD.ref} ${newId}] ${msg}`, 'success');
        }

        // FETCH
        if (subCmd === 'fetch') {
            const remoteName = args[2] || 'origin';

            if (!newState.git.remotes[remoteName]) {
                return formatOutput(`fatal: '${remoteName}' does not appear to be a git repository`, 'error');
            }

            const remote = newState.git.remotes[remoteName];

            // Sync commits from remote to local (simplified simulation)
            let newCommits = 0;
            remote.commits.forEach(remoteCommit => {
                if (!newState.git.commits.find(c => c.id === remoteCommit.id)) {
                    newState.git.commits.push(JSON.parse(JSON.stringify(remoteCommit)));
                    newCommits++;
                }
            });

            if (newCommits === 0) {
                return formatOutput(`From ${remote.url}\n * [up to date]`, 'success');
            }

            return formatOutput(`From ${remote.url}\n * [new commits]    ${newCommits} objects`, 'success');
        }

        // PULL
        if (subCmd === 'pull') {
            let remoteName = args[2] || 'origin';
            let branchName = args[3];

            if (!newState.git.remotes[remoteName]) {
                return formatOutput(`fatal: '${remoteName}' does not appear to be a git repository`, 'error');
            }

            const remote = newState.git.remotes[remoteName];
            if (!branchName) branchName = newState.git.HEAD.ref;

            // Step 1: Fetch - sync commits
            let newCommits = 0;
            remote.commits.forEach(remoteCommit => {
                if (!newState.git.commits.find(c => c.id === remoteCommit.id)) {
                    newState.git.commits.push(JSON.parse(JSON.stringify(remoteCommit)));
                    newCommits++;
                }
            });

            // Step 2: Merge - update local branch to remote branch
            const remoteCommitId = remote.branches[branchName];
            if (!remoteCommitId) {
                return formatOutput(`Already up to date.`, 'success');
            }

            const localCommitId = newState.git.branches[branchName];

            if (localCommitId === remoteCommitId) {
                return formatOutput(`Already up to date.`, 'success');
            }

            // Fast-forward merge (simplified)
            newState.git.branches[branchName] = remoteCommitId;

            // Update file system to match
            const targetCommit = newState.git.commits.find(c => c.id === remoteCommitId);
            if (targetCommit) {
                newState.fileSystem = JSON.parse(targetCommit.treeSnapshot);
            }

            return formatOutput(`From ${remote.url}\nUpdating ${localCommitId?.substring(0, 7) || '000000'}..${remoteCommitId.substring(0, 7)}\nFast-forward`, 'success');
        }

        // LOG
        if (subCmd === 'log') {
            const limit = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 5 : 5;
            const oneline = args.includes('--oneline');

            if (newState.git.commits.length === 0) {
                return formatOutput('fatal: your current branch does not have any commits yet', 'error');
            }

            const commits = newState.git.commits.slice(-limit).reverse();

            if (oneline) {
                const output = commits.map(c => `${c.id} ${c.message}`).join('\n');
                return formatOutput(output, 'info');
            }

            const output = commits.map(c => {
                const date = new Date(c.timestamp);
                return `commit ${c.id}\nAuthor: ${c.author}\nDate:   ${date.toLocaleString()}\n\n    ${c.message}\n`;
            }).join('\n');

            return formatOutput(output, 'info');
        }
    }

    return formatOutput(`Command not found: ${command}`, 'error');
};

export const executeCommand = (cmd: string, state: GameState) => {
    return runSingleCommand(cmd, state);
};