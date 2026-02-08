
import { Mission, GameState } from '../types';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

export const BADGES: Badge[] = [
    { id: 'first_commit', name: 'First Commit', description: 'Made your first commit', icon: '🎯', color: 'from-green-500 to-emerald-600' },
    { id: 'git_master', name: 'Git Master', description: 'Completed all Git missions', icon: '🌳', color: 'from-orange-500 to-red-600' },
    { id: 'terminal_pro', name: 'Terminal Pro', description: 'Completed all Terminal missions', icon: '⌨️', color: 'from-blue-500 to-indigo-600' },
    { id: 'level_up', name: 'Level Up!', description: 'Reached Level 2', icon: '⬆️', color: 'from-purple-500 to-pink-600' },
    { id: 'streak_3', name: 'On Fire', description: '3 day learning streak', icon: '🔥', color: 'from-orange-500 to-yellow-500' },
    { id: 'xp_500', name: 'XP Hunter', description: 'Earned 500 XP', icon: '💎', color: 'from-cyan-500 to-blue-600' },
    { id: 'branch_master', name: 'Branch Master', description: 'Created your first branch', icon: '🌿', color: 'from-green-600 to-teal-600' },
    { id: 'merge_complete', name: 'Merger', description: 'Completed a merge', icon: '🔀', color: 'from-violet-500 to-purple-600' },
];

export const MISSIONS: Mission[] = [
    // --- MODULE 1: GIT ---
    {
        id: 'git-1',
        title: "Operation Genesis",
        description: "Initialize a repository and make your first commit to secure the timeline.",
        category: 'Git',
        difficulty: "Beginner",
        xp: 100,
        theory: "Think of Git like a video game 'Save System.' `git init` starts the game. `git add` chooses which items (files) go into your backpack. `git commit` actually saves the game state so you can respawn there later if you mess up.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: {} } },
        tasks: [
            { id: 't1', description: "Initialize a git repository.", completed: false, hint: "git init", check: (s: any) => s.git.repoInitialized },
            { id: 't2', description: "Create 'hero.txt'", completed: false, hint: "touch hero.txt", check: (s: any) => !!s.fileSystem['project']?.children?.['hero.txt'] },
            { id: 't3', description: "Stage hero.txt", completed: false, hint: "git add hero.txt", check: (s: any) => s.git.staging.includes('hero.txt') },
            { id: 't4', description: "Commit with message 'Initial save'", completed: false, hint: "git commit -m 'Initial save'", check: (s: any) => s.git.commits.length > 0 }
        ]
    },
    {
        id: 'git-3',
        title: "The Hydra Merge",
        description: "Manage multiple timelines (branches) and merge them back.",
        category: 'Git',
        difficulty: "Expert",
        xp: 500,
        theory: "Branches are parallel universes. You create them with `git branch`, switch with `git checkout`, and combine them with `git merge`.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: { 'app.js': { type: 'file', name: 'app.js', content: 'App v1' } } } },
        tasks: [
            {
                id: 't1', description: "Init and commit initial state", completed: false, hint: "git init && git add . && git commit -m 'init'",
                check: (s: any) => s.git.commits.length >= 1 && s.git.repoInitialized
            },
            {
                id: 't2', description: "Create branch 'feature' and switch to it", completed: false, hint: "git checkout -b feature",
                check: (s: any) => s.git.HEAD.type === 'branch' && s.git.HEAD.ref === 'feature'
            },
            {
                id: 't3', description: "Modify app.js and commit", completed: false, hint: "touch app.js (simulate edit) -> add -> commit",
                check: (s: any) => s.git.commits.length >= 2 && s.git.branches['feature'] !== s.git.branches['main']
            },
            {
                id: 't4', description: "Switch back to main and merge feature", completed: false, hint: "git checkout main -> git merge feature",
                check: (s: any) => {
                    const headCommitId = s.git.branches[s.git.HEAD.ref];
                    const headCommit = s.git.commits.find((c: any) => c.id === headCommitId);
                    return s.git.HEAD.ref === 'main' && !!headCommit?.mergeParentId;
                }
            }
        ]
    },
    {
        id: 'git-4',
        title: "Cloud Uplink",
        description: "Push your local timeline to the remote server.",
        category: 'Git',
        difficulty: "Expert",
        xp: 600,
        theory: "Your code lives on your machine (Local). To share it, you must push it to a Server (Remote). `git remote add` connects the wire. `git push` sends the data.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: { 'main.py': { type: 'file', name: 'main.py', content: 'print("Hello World")' } } } },
        tasks: [
            { id: 't1', description: "Initialize the repository.", completed: false, hint: "git init", check: (s: any) => s.git.repoInitialized },
            { id: 't2', description: "Stage the 'main.py' file.", completed: false, hint: "git add main.py", check: (s: any) => s.git.staging.includes('main.py') },
            { id: 't3', description: "Commit the file.", completed: false, hint: "git commit -m \"Initial commit\"", check: (s: any) => s.git.commits.length > 0 },
            {
                id: 't4', description: "Link remote 'origin'", completed: false, hint: "git remote add origin https://github.com/user/repo.git",
                check: (s: any) => !!s.git.remotes['origin']
            },
            {
                id: 't5', description: "Push code to origin's main branch", completed: false, hint: "git push origin main",
                check: (s: any) => {
                    const remote = s.git.remotes['origin'];
                    return remote && remote.commits.length > 0 && !!remote.branches['main'];
                }
            }
        ]
    },

    // --- MODULE 2: BASH ---
    {
        id: 'bash-1',
        title: "Base Construction",
        description: "Navigate the void. Build your directory structure.",
        category: 'Terminal',
        difficulty: "Beginner",
        xp: 50,
        theory: "`pwd` = Where am I? `ls` = What's here? `cd` = Teleport. `mkdir` = Build room.",
        initialFileSystem: { 'home': { type: 'directory', name: 'home', children: {} } },
        tasks: [
            { id: 't1', description: "Go to /home", completed: false, hint: "cd /home", check: (s: any) => s.cwd === '/home' },
            { id: 't2', description: "Create 'base' folder", completed: false, hint: "mkdir base", check: (s: any) => !!s.fileSystem['home']?.children?.['base'] },
            { id: 't3', description: "Enter base and build 'bunker'", completed: false, hint: "cd base; mkdir bunker", check: (s: any) => !!s.fileSystem['home']?.children?.['base']?.children?.['bunker'] }
        ]
    },

    // --- MODULE 3: CORE DEV ---
    {
        id: 'core-1',
        title: "Secret Agent",
        description: "Learn how to handle secrets and environment variables safely.",
        category: 'Core',
        difficulty: "Beginner",
        xp: 150,
        theory: "Secrets (like API keys) should NEVER be hardcoded in your source code.\n\n**Stage 1:** `export KEY=VALUE` sets a variable for the current session (RAM only).\n**Stage 2:** `.env` files persist secrets locally.\n**Stage 3:** `.gitignore` prevents secrets from being committed.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: {} } },
        tasks: [
            {
                id: 't1',
                description: "Stage 1: Export session variable API_KEY=12345",
                completed: false,
                hint: "export API_KEY=12345",
                check: (s: any) => s.envVariables['API_KEY'] === '12345'
            },
            {
                id: 't2',
                description: "Stage 2: Create .env file with the secret",
                completed: false,
                hint: "echo \"API_KEY=12345\" > .env",
                check: (s: any) => {
                    const f = s.fileSystem['project']?.children?.['.env'];
                    return f?.type === 'file' && f.content?.includes('API_KEY=12345') || false;
                }
            },
            {
                id: 't3',
                description: "Read .env to verify it saved",
                completed: false,
                hint: "cat .env",
                check: (s: any) => s.commandHistory.some((cmd: any) => cmd.startsWith('cat') && cmd.includes('.env'))
            },
            {
                id: 't4',
                description: "Stage 3: Create .gitignore to protect secrets",
                completed: false,
                hint: "echo \".env\" > .gitignore",
                check: (s: any) => {
                    const f = s.fileSystem['project']?.children?.['.gitignore'];
                    return f?.type === 'file' && f.content?.includes('.env') || false;
                }
            }
        ]
    },

    // --- NEW GIT MISSIONS ---
    {
        id: 'git-5',
        title: "Stash Ninja",
        description: "Learn to temporarily save work without committing.",
        category: 'Git',
        difficulty: "Intermediate",
        xp: 300,
        theory: "`git stash` saves your uncommitted changes to a hidden stack. Useful when you need to switch branches but aren't ready to commit. `git stash pop` brings them back.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: { 'main.js': { type: 'file', name: 'main.js', content: 'console.log("hello")' } } } },
        tasks: [
            { id: 't1', description: "Initialize repo and make a commit", completed: false, hint: "git init && git add . && git commit -m 'init'", check: (s: any) => s.git.commits.length >= 1 },
            { id: 't2', description: "Create a new file 'feature.js'", completed: false, hint: "touch feature.js", check: (s: any) => !!s.fileSystem['project']?.children?.['feature.js'] },
            { id: 't3', description: "Stage the file", completed: false, hint: "git add feature.js", check: (s: any) => s.git.staging.includes('feature.js') },
            { id: 't4', description: "Stash your changes", completed: false, hint: "git stash", check: (s: any) => s.git.stash && s.git.stash.length > 0 },
            { id: 't5', description: "Restore with stash pop", completed: false, hint: "git stash pop", check: (s: any) => s.git.stash?.length === 0 && s.git.staging.length > 0 }
        ]
    },
    {
        id: 'git-6',
        title: "Reset Lab",
        description: "Master the dangerous art of rewriting history.",
        category: 'Git',
        difficulty: "Expert",
        xp: 400,
        theory: "`git reset` moves the HEAD pointer. `--soft` keeps changes staged. `--hard` discards everything. Use with caution on shared branches!",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: { 'data.txt': { type: 'file', name: 'data.txt', content: 'important' } } } },
        tasks: [
            { id: 't1', description: "Init and create 2 commits", completed: false, hint: "git init && git add . && git commit -m 'c1' && touch file2 && git add . && git commit -m 'c2'", check: (s: any) => s.git.commits.length >= 2 },
            { id: 't2', description: "Check git log", completed: false, hint: "git log --oneline", check: (s: any) => s.commandHistory.some((c: any) => c.includes('git log')) },
            { id: 't3', description: "Soft reset to previous commit", completed: false, hint: "git reset --soft HEAD~1", check: (s: any) => s.git.staging.length > 0 || s.commandHistory.some((c: any) => c.includes('reset --soft')) }
        ]
    },
    {
        id: 'git-7',
        title: "Log Explorer",
        description: "Navigate the commit timeline like a pro.",
        category: 'Git',
        difficulty: "Beginner",
        xp: 100,
        theory: "`git log` shows commit history. Add `--oneline` for compact view. `git status` shows current state.",
        initialFileSystem: { 'project': { type: 'directory', name: 'project', children: { 'readme.md': { type: 'file', name: 'readme.md', content: '# Project' } } } },
        tasks: [
            { id: 't1', description: "Initialize and commit", completed: false, hint: "git init && git add . && git commit -m 'first'", check: (s: any) => s.git.commits.length >= 1 },
            { id: 't2', description: "Check status", completed: false, hint: "git status", check: (s: any) => s.commandHistory.some((c: any) => c === 'git status') },
            { id: 't3', description: "View log in one-line format", completed: false, hint: "git log --oneline", check: (s: any) => s.commandHistory.some((c: any) => c.includes('git log')) }
        ]
    },

    // --- NEW TERMINAL MISSIONS ---
    {
        id: 'bash-2',
        title: "File Hunter",
        description: "Search and find files like a detective.",
        category: 'Terminal',
        difficulty: "Intermediate",
        xp: 200,
        theory: "`find` searches by filename. `grep` searches file contents. Combine them to locate anything!",
        initialFileSystem: {
            'home': {
                type: 'directory',
                name: 'home',
                children: {
                    'docs': {
                        type: 'directory',
                        name: 'docs',
                        children: {
                            'secret.txt': { type: 'file', name: 'secret.txt', content: 'PASSWORD=hunter2' },
                            'notes.md': { type: 'file', name: 'notes.md', content: '# My Notes\nImportant stuff' }
                        }
                    }
                }
            }
        },
        tasks: [
            { id: 't1', description: "Find files with .txt extension", completed: false, hint: "find . -name \"*.txt\"", check: (s: any) => s.commandHistory.some((c: any) => c.includes('find') && c.includes('.txt')) },
            { id: 't2', description: "Search for 'PASSWORD' in files", completed: false, hint: "grep PASSWORD docs/secret.txt", check: (s: any) => s.commandHistory.some((c: any) => c.includes('grep') && c.includes('PASSWORD')) },
            { id: 't3', description: "Count lines in notes.md", completed: false, hint: "wc -l docs/notes.md", check: (s: any) => s.commandHistory.some((c: any) => c.includes('wc') && c.includes('notes')) }
        ]
    },
    {
        id: 'bash-3',
        title: "Pipe Mastery",
        description: "Chain commands together for maximum power.",
        category: 'Terminal',
        difficulty: "Expert",
        xp: 350,
        theory: "The pipe `|` sends output from one command as input to another. `>` writes to file. `>>` appends to file.",
        initialFileSystem: {
            'home': {
                type: 'directory',
                name: 'home',
                children: {
                    'data.log': { type: 'file', name: 'data.log', content: 'INFO: Started\nERROR: Failed\nINFO: Running\nERROR: Crashed\nINFO: Done' }
                }
            }
        },
        tasks: [
            { id: 't1', description: "View the log file", completed: false, hint: "cat data.log", check: (s: any) => s.commandHistory.some((c: any) => c.includes('cat') && c.includes('data.log')) },
            { id: 't2', description: "Filter only ERROR lines using grep", completed: false, hint: "grep ERROR data.log", check: (s: any) => s.commandHistory.some((c: any) => c.includes('grep') && c.includes('ERROR')) },
            { id: 't3', description: "Save filtered output to errors.txt", completed: false, hint: "grep ERROR data.log > errors.txt", check: (s: any) => !!s.fileSystem['home']?.children?.['errors.txt'] },
            { id: 't4', description: "Append another line to errors.txt", completed: false, hint: "echo \"Manual entry\" >> errors.txt", check: (s: any) => s.fileSystem['home']?.children?.['errors.txt']?.content?.includes('Manual') || false }
        ]
    }
];
