import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import MissionView from './components/MissionView';
import { GameView, Mission, UserProgress } from './types';
import { Terminal, GitBranch, Cpu, ChevronRight } from 'lucide-react';

const MISSIONS: Mission[] = [
  // --- MODULE 1: GIT ---
  {
    id: 'git-1',
    title: "Operation Genesis",
    description: "Initialize a repository and make your first commit to secure the timeline.",
    category: 'Git',
    difficulty: "Beginner",
    xp: 100,
    theory: "Think of Git like a video game 'Save System.' `git init` starts the game. `git add` chooses which items (files) go into your backpack. `git commit` actually saves the game state so you can respawn there later if you mess up.",
    initialFileSystem: { 'project': { type: 'directory', name: 'project', children: {} }},
    tasks: [
        { id: 't1', description: "Initialize a git repository.", completed: false, hint: "git init", check: (s) => s.git.repoInitialized },
        { id: 't2', description: "Create 'hero.txt'", completed: false, hint: "touch hero.txt", check: (s) => !!s.fileSystem['project']?.children?.['hero.txt'] },
        { id: 't3', description: "Stage hero.txt", completed: false, hint: "git add hero.txt", check: (s) => s.git.staging.includes('hero.txt') },
        { id: 't4', description: "Commit with message 'Initial save'", completed: false, hint: "git commit -m 'Initial save'", check: (s) => s.git.commits.length > 0 }
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
            check: (s) => s.git.commits.length >= 1 && s.git.repoInitialized 
        },
        { 
            id: 't2', description: "Create branch 'feature' and switch to it", completed: false, hint: "git checkout -b feature", 
            check: (s) => s.git.HEAD.type === 'branch' && s.git.HEAD.ref === 'feature' 
        },
        { 
            id: 't3', description: "Modify app.js and commit", completed: false, hint: "touch app.js (simulate edit) -> add -> commit", 
            check: (s) => s.git.commits.length >= 2 && s.git.branches['feature'] !== s.git.branches['main'] 
        },
        { 
            id: 't4', description: "Switch back to main and merge feature", completed: false, hint: "git checkout main -> git merge feature", 
            check: (s) => {
                 const headCommitId = s.git.branches[s.git.HEAD.ref];
                 const headCommit = s.git.commits.find(c => c.id === headCommitId);
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
        { id: 't1', description: "Initialize the repository.", completed: false, hint: "git init", check: (s) => s.git.repoInitialized },
        { id: 't2', description: "Stage the 'main.py' file.", completed: false, hint: "git add main.py", check: (s) => s.git.staging.includes('main.py')},
        { id: 't3', description: "Commit the file.", completed: false, hint: "git commit -m \"Initial commit\"", check: (s) => s.git.commits.length > 0 },
        { 
            id: 't4', description: "Link remote 'origin'", completed: false, hint: "git remote add origin https://github.com/user/repo.git", 
            check: (s) => !!s.git.remotes['origin'] 
        },
        { 
            id: 't5', description: "Push code to origin's main branch", completed: false, hint: "git push origin main", 
            check: (s) => {
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
        { id: 't1', description: "Go to /home", completed: false, hint: "cd /home", check: (s) => s.cwd === '/home' },
        { id: 't2', description: "Create 'base' folder", completed: false, hint: "mkdir base", check: (s) => !!s.fileSystem['home']?.children?.['base'] },
        { id: 't3', description: "Enter base and build 'bunker'", completed: false, hint: "cd base; mkdir bunker", check: (s) => !!s.fileSystem['home']?.children?.['base']?.children?.['bunker'] }
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
    theory: "Secrets (like API keys) should NEVER be hardcoded in your source code. \n\n1. `export KEY=VALUE` sets a variable for the current session (RAM only).\n2. `.env` files are used to persist secrets locally, but must be ignored by Git.",
    initialFileSystem: { 'project': { type: 'directory', name: 'project', children: {} } },
    tasks: [
        { 
            id: 't1', 
            description: "Export a session variable (API_KEY)", 
            completed: false, 
            hint: "export API_KEY=12345", 
            check: (s) => s.envVariables['API_KEY'] === '12345' 
        },
        { 
            id: 't2', 
            description: "Create a .env file with the secret", 
            completed: false, 
            hint: "echo \"API_KEY=12345\" > .env", 
            check: (s) => {
                const f = s.fileSystem['project']?.children?.['.env'];
                return f?.type === 'file' && f.content?.includes('API_KEY=12345') || false;
            }
        },
        { 
            id: 't3', 
            description: "Verify .env content", 
            completed: false, 
            hint: "cat .env", 
            check: (s) => s.commandHistory.some(cmd => cmd.startsWith('cat') && cmd.includes('.env')) 
        }
    ]
  }
];

const LandingPage = ({ onStart }: { onStart: () => void }) => (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyber-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 text-center max-w-4xl px-4">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                Dev<span className="text-cyber-primary">Quest</span>
            </h1>
            <p className="text-xl md:text-2xl text-cyber-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                Master the Terminal, Git, and Core Dev Skills through interactive simulation.
            </p>
            <button 
                onClick={onStart}
                className="group relative px-8 py-4 bg-cyber-primary hover:bg-emerald-400 text-black font-bold rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,220,130,0.4)] hover:-translate-y-1"
            >
                <div className="flex items-center gap-2">
                    INITIALIZE TRAINING
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<GameView>(GameView.LANDING);
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgress>({
      xp: 0,
      streak: 1,
      level: 1,
      completedMissions: [],
      badges: []
  });

  const startMission = (id: string) => {
    setCurrentMissionId(id);
    setView(GameView.MISSION);
  };

  const handleMissionComplete = (missionXP: number) => {
      setProgress(prev => ({
          ...prev,
          xp: prev.xp + missionXP,
          completedMissions: [...new Set([...prev.completedMissions, currentMissionId!])],
      }));
  }

  const exitMission = () => {
    setView(GameView.DASHBOARD);
    setCurrentMissionId(null);
  };

  const activeMission = MISSIONS.find(m => m.id === currentMissionId);

  if (view === GameView.LANDING) {
      return <LandingPage onStart={() => setView(GameView.DASHBOARD)} />;
  }

  if (view === GameView.MISSION && activeMission) {
    return (
        <MissionView 
            mission={activeMission} 
            onExit={exitMission} 
            onComplete={handleMissionComplete}
        />
    );
  }

  return (
      <Dashboard 
        startMission={startMission} 
        missions={MISSIONS} 
        userProgress={progress}
      />
  );
};

export default App;
