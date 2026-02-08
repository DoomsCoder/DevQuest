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
  staging: string[]; // List of file paths (staged files)
  repoInitialized: boolean;
  remotes: { [key: string]: RemoteRepo }; // e.g. 'origin'
  activeRemoteBranch?: string; // For tracking upstream, e.g., 'origin/main'
  stash?: { id: string; staging: string[]; fileSnapshot: string; message: string; timestamp: number }[]; // Stash stack
  // Enhanced file state tracking for realistic git status
  workingDirectory: {
    modified: string[];   // Files modified but not staged
    deleted: string[];    // Files deleted but not staged
  };
  trackedFiles: string[]; // Files that have been committed at least once
}

// Structured output line for colored terminal rendering
export interface TerminalOutputLine {
  text: string;
  type: 'header' | 'hint' | 'staged' | 'modified' | 'untracked' | 'deleted' | 'normal' | 'branch' | 'branch-current';
  tooltip?: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'git-status' | 'git-branch';
  content: string;
  structured?: {
    lines: TerminalOutputLine[];
  };
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

export interface UserProfile {
  id: string; // uuid
  user_id: string; // clerk user id
  username: string;
  avatar_url: string;
  xp: number;
  level: number;
  streak: number;
  badges?: string[];
  last_active: string; // timestamp
  created_at: string; // timestamp
}

export interface MissionCompleted {
  id: string;
  user_id: string;
  mission_id: string;
  xp_earned: number;
  completed_at: string;
}

export interface MissionHistoryRecord {
  id: string;
  user_id: string;
  mission_id: string;
  commands: any[]; // strict JSON type later if needed
  repo_state: any;
  completed: boolean;
  created_at: string;
}

export interface UserProgress {
  // Legacy frontend interface - tailored for UI
  xp: number;
  streak: number;
  level: number;
  completedMissions: string[]; // List of IDs
  badges: string[];
  lastActiveDate: string;
  username: string;
  avatarSeed: string;
}

export const GameView = {
  LANDING: 'LANDING',
  DASHBOARD: 'DASHBOARD',
  MISSION: 'MISSION',
} as const;

export type GameView = typeof GameView[keyof typeof GameView];