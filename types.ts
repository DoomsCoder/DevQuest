export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: { [key: string]: FileNode };
  permissions?: string; // e.g. "drwxr-xr-x"
  owner?: string;
  group?: string;
  size?: number;
  modified?: number; // timestamp
}

export interface Commit {
  id: string;
  message: string;
  parentId: string | null;
  mergeParentId?: string | null; // Critical for 3-way merge visualization
  timestamp: number;
  author: string;
  treeSnapshot: string; // Serialized file system state
}

export interface RemoteRepo {
  url: string;
  commits: Commit[];
  branches: { [key: string]: string };
}

export interface GitState {
  commits: Commit[];
  branches: { [key: string]: string }; // branchName -> commitId
  HEAD: { type: 'branch' | 'commit'; ref: string }; // ref is branchName or commitId
  staging: string[]; // List of file paths
  repoInitialized: boolean;
  remotes: { [key: string]: RemoteRepo }; // e.g. 'origin'
  activeRemoteBranch?: string; // For tracking upstream, e.g., 'origin/main'
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  content: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: 'Git' | 'Terminal' | 'Core';
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  xp: number;
  tasks: Task[];
  initialFileSystem: { [key: string]: FileNode };
  theory?: string; // Short educational content
}

export interface Task {
  id: string;
  description: string;
  check: (state: GameState) => boolean;
  completed: boolean;
  hint: string;
}

export interface GameState {
  fileSystem: { [key: string]: FileNode };
  git: GitState;
  cwd: string; // Current working directory path
  commandHistory: string[];
  envVariables: { [key: string]: string }; // Environment variables
  lastCommandOutput?: string;
  activeEditor?: { file: string; content: string }; // For Vim simulation
}

export interface SavedMissionState {
  gameState: GameState;
  history: TerminalLine[];
  activeTaskIndex: number;
  missionId: string;
  completed: boolean;
}

export interface UserProgress {
  xp: number;
  streak: number;
  level: number;
  completedMissions: string[];
  badges: string[];
}

export const GameView = {
  LANDING: 'LANDING',
  DASHBOARD: 'DASHBOARD',
  MISSION: 'MISSION',
} as const;

export type GameView = typeof GameView[keyof typeof GameView];