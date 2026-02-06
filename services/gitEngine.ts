import { GameState, FileNode, GitState, Commit } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    remotes: {}
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

const runSingleCommand = (cmd: string, state: GameState): { output: string, type: 'success' | 'error' | 'info', newState: GameState } => {
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
        // Construct message from args, stopping at redirects
        let parts = [];
        for (let i = 1; i < args.length; i++) {
            if (args[i] === '>' || args[i] === '>>') break;
            parts.push(args[i]);
        }
        return formatOutput(parts.join(' '), 'success');
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
                for(const p of parts) {
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

        // STATUS
        if (subCmd === 'status') {
            let status = '';
            const headInfo = newState.git.HEAD.type === 'branch' 
                ? `On branch ${newState.git.HEAD.ref}` 
                : `HEAD detached at ${newState.git.HEAD.ref}`;
            status += headInfo + '\n';
            
            if (newState.git.staging.length > 0) {
                status += `Changes to be committed:\n  ${newState.git.staging.map(f => `new file:   ${f}`).join('\n  ')}\n`;
            }

            const untrackedFiles = Object.keys(newState.fileSystem['project']?.children || {})
                .filter(file => !newState.git.staging.includes(file)); // Simplified for this simulation

            if (untrackedFiles.length > 0 && newState.git.commits.length === 0) { // Only show untracked if not already committed
                 status += `Untracked files:\n  ${untrackedFiles.join('\n  ')}\n`;
            }

            if (newState.git.staging.length === 0 && untrackedFiles.length === 0) {
                 status += 'nothing to commit, working tree clean';
            }
            
            return formatOutput(status, 'info');
        }

        // ADD
        if (subCmd === 'add') {
             const files = args.slice(2);
             if (files.includes('.')) {
                 const { node } = resolvePath(newState.fileSystem, '.', newState.cwd);
                 if (node && node.children) {
                     const names = Object.keys(node.children).filter(k => node.children![k].type === 'file');
                     newState.git.staging = [...new Set([...newState.git.staging, ...names])];
                 }
             } else {
                 files.forEach(f => {
                    const { node } = resolvePath(newState.fileSystem, f, newState.cwd);
                    if (node && node.type === 'file') newState.git.staging = [...new Set([...newState.git.staging, f])];
                 });
             }
             return formatOutput('', 'success');
        }

        // COMMIT
        if (subCmd === 'commit') {
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
             
             newState.git.commits.push(commit);
             newState.git.staging = [];
             
             if (newState.git.HEAD.type === 'branch') {
                 newState.git.branches[newState.git.HEAD.ref] = newId;
             } else {
                 newState.git.HEAD.ref = newId;
             }
             return formatOutput(`[${newState.git.HEAD.ref} ${newId}] ${msg}`, 'success');
        }

        // BRANCH
        if (subCmd === 'branch') {
            // git branch -M main
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
            // git branch <name>
            const name = args[2];
            if (!name) {
                const list = Object.keys(newState.git.branches).map(b => 
                    (newState.git.HEAD.type === 'branch' && newState.git.HEAD.ref === b ? '* ' : '  ') + b
                ).join('\n');
                return formatOutput(list, 'info');
            }
            if (newState.git.branches[name]) return formatOutput(`fatal: A branch named '${name}' already exists.`, 'error');
            
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
    }

    return formatOutput(`Command not found: ${command}`, 'error');
};

export const executeCommand = (cmd: string, state: GameState) => {
    return runSingleCommand(cmd, state);
};