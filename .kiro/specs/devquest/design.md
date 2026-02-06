# DevQuest Design Document

## Overview

DevQuest is a gamified educational platform built with React 19 and TypeScript that teaches developers Git, Terminal (Bash), and core development skills through interactive missions. The architecture separates concerns into distinct layers: UI components, game state management, simulation engines, and external integrations.

The system uses a mission-based learning model where users complete tasks within missions, with real-time validation, progress tracking, and AI-powered tutoring. All simulations (file system, Git, terminal) operate in-memory without affecting the user's actual system.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI Layer                          │
│  (Landing, Dashboard, MissionView, Terminal, VimEditor)    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              State Management Layer                         │
│  (Game State, Mission State, User Progress)                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│           Simulation & Logic Layer                          │
│  (FileSystem, GitEngine, Terminal, VimEditor, TaskChecker) │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│          External Integration Layer                         │
│  (Gemini API, Local Storage)                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
App
├── Landing
├── Dashboard
│   ├── MissionBrowser
│   ├── UserProfile
│   └── ProgressTracker
├── MissionView
│   ├── TaskPanel
│   ├── Terminal
│   ├── VimEditor
│   ├── GitGraph
│   ├── EnvVisualizer
│   ├── TutorChat
│   └── FileExplorer
└── ErrorBoundary
```

## Components and Interfaces

### Core Data Models

```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  category: 'Git' | 'Terminal' | 'Core';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  xpReward: number;
  tasks: Task[];
  initialFileSystem: FileSystemState;
  initialGitState?: GitState;
  initialEnvVars?: Record<string, string>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  validator: TaskValidator;
  completed: boolean;
}

interface TaskValidator {
  type: 'file' | 'git' | 'command' | 'custom';
  criteria: ValidationCriteria;
}

interface ValidationCriteria {
  fileChecks?: FileCheck[];
  gitChecks?: GitCheck[];
  commandChecks?: CommandCheck[];
  customCheck?: (state: MissionState) => boolean;
}

interface UserProgress {
  userId: string;
  totalXP: number;
  level: number;
  streak: number;
  lastCompletionDate: Date;
  completedMissions: string[];
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}

interface MissionState {
  missionId: string;
  fileSystem: FileSystemState;
  gitState: GitState;
  envVars: Record<string, string>;
  taskProgress: TaskProgress[];
  terminalHistory: TerminalCommand[];
  vimEditorState: VimEditorState;
}

interface FileSystemState {
  nodes: Map<string, FileNode>;
  currentWorkingDirectory: string;
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  metadata: FileMetadata;
  children?: string[];
}

interface FileMetadata {
  createdAt: Date;
  modifiedAt: Date;
  permissions: string;
  owner: string;
}

interface GitState {
  initialized: boolean;
  commits: Commit[];
  branches: Map<string, string>;
  currentBranch: string;
  stagingArea: string[];
  remotes: Map<string, string>;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  fileSnapshot: Map<string, string>;
  parent?: string;
}

interface TerminalCommand {
  command: string;
  args: string[];
  output: string;
  exitCode: number;
  timestamp: Date;
}

interface VimEditorState {
  mode: 'normal' | 'insert' | 'command';
  currentFile: string;
  content: string;
  cursorPosition: { line: number; column: number };
  clipboard: string;
  unsavedChanges: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  missionContext?: string;
}
```

### Service Interfaces

```typescript
interface FileSystemService {
  createFile(path: string, content: string): void;
  readFile(path: string): string;
  updateFile(path: string, content: string): void;
  deleteFile(path: string): void;
  createDirectory(path: string): void;
  listDirectory(path: string): FileNode[];
  changeDirectory(path: string): void;
  getCurrentDirectory(): string;
  getFileSystemState(): FileSystemState;
  restoreFileSystemState(state: FileSystemState): void;
}

interface GitEngineService {
  init(): void;
  add(files: string[]): void;
  commit(message: string, author: string): Commit;
  branch(name: string, action: 'create' | 'delete' | 'list'): string[];
  checkout(target: string): void;
  merge(sourceBranch: string): MergeResult;
  push(remote: string, branch: string): void;
  addRemote(name: string, url: string): void;
  getGitState(): GitState;
  restoreGitState(state: GitState): void;
}

interface TerminalService {
  executeCommand(command: string, args: string[]): TerminalCommand;
  parseCommand(input: string): { command: string; args: string[] };
  getCommandOutput(command: string, args: string[]): string;
  getTerminalHistory(): TerminalCommand[];
}

interface VimEditorService {
  openFile(path: string): void;
  closeFile(): void;
  enterInsertMode(): void;
  exitInsertMode(): void;
  deleteCurrentLine(): void;
  copyCurrentLine(): void;
  pasteContent(): void;
  saveFile(): void;
  getEditorState(): VimEditorState;
}

interface TaskCheckerService {
  validateTask(task: Task, state: MissionState): ValidationResult;
  checkFileExists(path: string, expectedContent?: string): boolean;
  checkGitState(checks: GitCheck[], state: GitState): boolean;
  checkCommandOutput(command: string, expectedOutput: string): boolean;
}

interface GeminiService {
  sendMessage(message: string, context: MissionContext): Promise<string>;
  getHint(taskId: string, missionContext: MissionContext): Promise<string>;
  explainConcept(concept: string, missionContext: MissionContext): Promise<string>;
}

interface MissionContext {
  missionId: string;
  missionTitle: string;
  currentTaskId: string;
  currentTaskDescription: string;
  fileSystemState: FileSystemState;
  gitState: GitState;
}
```

## Data Models

### Mission Data Structure

Missions are defined as JSON objects with the following structure:

```json
{
  "id": "git-basics-1",
  "title": "Initialize Your First Repository",
  "description": "Learn how to initialize a Git repository and make your first commit",
  "category": "Git",
  "difficulty": "Beginner",
  "xpReward": 100,
  "tasks": [
    {
      "id": "task-1",
      "title": "Initialize Git Repository",
      "description": "Use git init to initialize a new Git repository",
      "acceptanceCriteria": [
        "A .git directory exists in the current directory",
        "Git is initialized and ready for use"
      ],
      "validator": {
        "type": "file",
        "criteria": {
          "fileChecks": [
            {
              "path": ".git",
              "shouldExist": true,
              "isDirectory": true
            }
          ]
        }
      }
    }
  ],
  "initialFileSystem": {
    "nodes": {},
    "currentWorkingDirectory": "/"
  }
}
```

### State Persistence

All mission state is persisted to localStorage with the following structure:

```json
{
  "userProgress": {
    "userId": "user-123",
    "totalXP": 500,
    "level": 2,
    "streak": 3,
    "completedMissions": ["git-basics-1", "terminal-basics-1"],
    "badges": []
  },
  "missionStates": {
    "git-basics-1": {
      "missionId": "git-basics-1",
      "fileSystem": {},
      "gitState": {},
      "taskProgress": []
    }
  }
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Mission Display Completeness
*For any* mission displayed on the dashboard, the mission card SHALL contain mission name, category, difficulty level, and XP reward.
**Validates: Requirements 1.2**

### Property 2: Category Filter Correctness
*For any* category filter applied to the mission list, all returned missions SHALL have the selected category.
**Validates: Requirements 1.3**

### Property 3: Difficulty Filter Correctness
*For any* difficulty filter applied to the mission list, all returned missions SHALL have the selected difficulty level.
**Validates: Requirements 1.4**

### Property 4: Search Result Accuracy
*For any* search query, all returned missions SHALL have names containing the search term (case-insensitive).
**Validates: Requirements 1.5**

### Property 5: Task Display Completeness
*For any* task displayed in a mission, the task panel SHALL show task description, acceptance criteria, and current completion status.
**Validates: Requirements 2.2**

### Property 6: Task Validation Execution
*For any* task action performed by the user, the task checker SHALL evaluate the action against the task's validation criteria.
**Validates: Requirements 2.3**

### Property 7: Successful Task Completion
*For any* task where validation criteria are met, the task SHALL be marked as complete and positive feedback SHALL be displayed.
**Validates: Requirements 2.4**

### Property 8: Task Validation Failure Feedback
*For any* task where validation criteria are not met, specific error feedback SHALL be provided explaining what's missing.
**Validates: Requirements 2.5**

### Property 9: Mission Completion XP Award
*For any* mission where all tasks are completed, the mission SHALL be marked complete and XP SHALL be awarded to the user.
**Validates: Requirements 2.6**

### Property 10: File Creation Persistence
*For any* file created in the file system simulator, the file SHALL be retrievable with correct content and metadata.
**Validates: Requirements 3.3**

### Property 11: File Modification Consistency
*For any* file that is modified, the file content SHALL be updated while file metadata (creation time, owner) SHALL be preserved.
**Validates: Requirements 3.4**

### Property 12: File Deletion Correctness
*For any* file that is deleted, the file SHALL no longer be retrievable from the file system.
**Validates: Requirements 3.5**

### Property 13: Directory Navigation State
*For any* directory navigation operation, the current working directory SHALL be correctly maintained and reflected in subsequent operations.
**Validates: Requirements 3.7**

### Property 14: File System State Persistence
*For any* mission state, the file system state SHALL be persisted and retrievable after the mission ends.
**Validates: Requirements 3.8**

### Property 15: Git Init Repository Creation
*For any* git init operation, a .git directory SHALL be created with proper repository metadata.
**Validates: Requirements 4.2**

### Property 16: Git Add Staging
*For any* file added with git add, the file SHALL appear in the staging area.
**Validates: Requirements 4.3**

### Property 17: Git Commit Completeness
*For any* commit created with git commit, the commit object SHALL contain message, author, timestamp, and file snapshot.
**Validates: Requirements 4.4**

### Property 18: Git Branch Creation
*For any* branch created with git branch, the branch SHALL be retrievable and point to the correct commit.
**Validates: Requirements 4.5**

### Property 19: Git Checkout Correctness
*For any* git checkout operation, HEAD SHALL point to the specified branch or commit.
**Validates: Requirements 4.6**

### Property 20: Git Merge History
*For any* git merge operation, the commit history SHALL reflect the merge with both parent commits recorded.
**Validates: Requirements 4.7**

### Property 21: Git Push Remote Update
*For any* git push operation, the remote repository SHALL be updated with the pushed commits.
**Validates: Requirements 4.8**

### Property 22: Git Remote Management
*For any* remote added with git remote, the remote SHALL be retrievable with correct URL.
**Validates: Requirements 4.9**

### Property 23: Git Graph Update Consistency
*For any* git operation performed, the git graph visualization SHALL update to reflect the new repository state.
**Validates: Requirements 4.10**

### Property 24: Command Parsing Correctness
*For any* command input, the terminal SHALL correctly parse the command and arguments.
**Validates: Requirements 5.2**

### Property 25: Command Execution File System Sync
*For any* command executed, the file system simulator SHALL be updated to reflect the command's effects.
**Validates: Requirements 5.3**

### Property 26: Successful Command Output Display
*For any* command that succeeds, the terminal SHALL display the command output and return to the prompt.
**Validates: Requirements 5.4**

### Property 27: Failed Command Error Display
*For any* command that fails, the terminal SHALL display an error message explaining the failure.
**Validates: Requirements 5.5**

### Property 28: Unknown Command Error
*For any* unknown command, the terminal SHALL display a "command not found" error message.
**Validates: Requirements 5.6**

### Property 29: Directory Change Correctness
*For any* cd command executed, the current working directory SHALL change to the specified directory.
**Validates: Requirements 5.7**

### Property 30: Directory Listing Completeness
*For any* ls command executed, all files and directories in the current directory SHALL be listed.
**Validates: Requirements 5.8**

### Property 31: File Content Display
*For any* cat command executed on a file, the file content SHALL be displayed.
**Validates: Requirements 5.9**

### Property 32: Environment Variable Substitution
*For any* command that references an environment variable, the variable SHALL be substituted with its value.
**Validates: Requirements 5.10**

### Property 33: Vim Insert Mode Entry
*For any* 'i' key press in normal mode, the editor SHALL enter insert mode and allow text input.
**Validates: Requirements 6.2**

### Property 34: Vim Normal Mode Return
*For any* Escape key press in insert mode, the editor SHALL exit insert mode and return to normal mode.
**Validates: Requirements 6.3**

### Property 35: Vim File Save
*For any* ':w' command in vim, the file SHALL be saved to the file system simulator.
**Validates: Requirements 6.4**

### Property 36: Vim Quit Without Changes
*For any* ':q' command with no unsaved changes, the editor SHALL close.
**Validates: Requirements 6.5**

### Property 37: Vim Save and Quit
*For any* ':wq' command, the file SHALL be saved and the editor SHALL close.
**Validates: Requirements 6.6**

### Property 38: Vim Force Quit
*For any* ':q!' command, the editor SHALL close without saving.
**Validates: Requirements 6.7**

### Property 39: Vim Line Deletion
*For any* 'dd' command, the current line SHALL be deleted from the file.
**Validates: Requirements 6.8**

### Property 40: Vim Line Copy
*For any* 'yy' command, the current line SHALL be copied to the clipboard.
**Validates: Requirements 6.9**

### Property 41: Vim Content Paste
*For any* 'p' command after a copy operation, the copied content SHALL be pasted.
**Validates: Requirements 6.10**

### Property 42: Task Validation Evaluation
*For any* user action, the task checker SHALL evaluate the action against the task's validation criteria.
**Validates: Requirements 7.2**

### Property 43: Task Completion Marking
*For any* task where validation criteria are met, the task SHALL be marked as complete.
**Validates: Requirements 7.3**

### Property 44: File Task Validation
*For any* task requiring file creation, the task checker SHALL verify the file exists with correct content.
**Validates: Requirements 7.5**

### Property 45: Git Task Validation
*For any* task requiring git operations, the task checker SHALL verify the git state matches expectations.
**Validates: Requirements 7.6**

### Property 46: Command Task Validation
*For any* task requiring terminal commands, the task checker SHALL verify the command output matches expected results.
**Validates: Requirements 7.7**

### Property 47: Task Completion XP Award
*For any* completed task, XP SHALL be awarded to the user.
**Validates: Requirements 7.8**

### Property 48: XP Accumulation
*For any* mission completion, user XP SHALL increase by the mission's reward amount.
**Validates: Requirements 8.1**

### Property 49: Level Calculation Correctness
*For any* XP amount, the user's level SHALL be calculated correctly based on XP thresholds.
**Validates: Requirements 8.2**

### Property 50: Streak Increment
*For any* mission completed on consecutive days, the streak counter SHALL increment.
**Validates: Requirements 8.3**

### Property 51: Streak Reset
*For any* day missed without mission completion, the streak counter SHALL reset to zero.
**Validates: Requirements 8.4**

### Property 52: Badge Award Correctness
*For any* specific mission combination completed, the corresponding badge SHALL be awarded.
**Validates: Requirements 8.5**

### Property 53: Profile Display Completeness
*For any* user viewing their profile, current XP, level, streak, and earned badges SHALL be displayed.
**Validates: Requirements 8.6**

### Property 54: Mission Completion Persistence
*For any* mission completed, the completion record SHALL be persisted to storage.
**Validates: Requirements 8.7**

### Property 55: Progress Restoration
*For any* user returning to the app, their updated progress SHALL be restored and displayed.
**Validates: Requirements 8.8**

### Property 56: Chat Interface Display
*For any* mission view, the AI tutor chat interface SHALL be displayed.
**Validates: Requirements 9.1**

### Property 57: Message Sending to API
*For any* user message, the message SHALL be sent to the Gemini API.
**Validates: Requirements 9.2**

### Property 58: API Response Display
*For any* Gemini API response, the response SHALL be displayed in the chat interface.
**Validates: Requirements 9.3**

### Property 59: Mission Context Inclusion
*For any* AI tutor request, mission context SHALL be included in the API request.
**Validates: Requirements 9.6**

### Property 60: API Failure Error Display
*For any* Gemini API failure, an error message SHALL be displayed and retry SHALL be allowed.
**Validates: Requirements 9.7**

### Property 61: Chat History Persistence
*For any* mission, chat history SHALL be preserved when the chat is closed.
**Validates: Requirements 9.8**

### Property 62: Git Graph State Reflection
*For any* git operation, the git graph visualization SHALL update to reflect the new repository state.
**Validates: Requirements 10.1**

### Property 63: Commit Display Completeness
*For any* commit in the repository, the commit SHALL be displayed with its message.
**Validates: Requirements 10.2**

### Property 64: Branch Display
*For any* branch in the repository, the branch pointer SHALL be displayed.
**Validates: Requirements 10.3**

### Property 65: Merge Display
*For any* branch merge, the merge connection SHALL be displayed in the graph.
**Validates: Requirements 10.4**

### Property 66: Multi-Branch Display
*For any* repository with multiple branches, all branches SHALL be displayed clearly.
**Validates: Requirements 10.6**

### Property 67: HEAD Highlighting
*For any* HEAD pointer, the HEAD position SHALL be highlighted in the graph.
**Validates: Requirements 10.7**

### Property 68: Environment Variable Storage
*For any* environment variable set, the variable SHALL be retrievable with its value.
**Validates: Requirements 11.2**

### Property 69: Environment Variable Substitution in Commands
*For any* command referencing an environment variable, the variable SHALL be substituted.
**Validates: Requirements 11.3**

### Property 70: Environment Variable Display
*For any* set of environment variables, all variables SHALL be displayed.
**Validates: Requirements 11.4**

### Property 71: Environment Variable Removal
*For any* environment variable unset, the variable SHALL no longer be retrievable.
**Validates: Requirements 11.5**

### Property 72: Environment State Persistence
*For any* mission, the environment variable state SHALL be persisted for verification.
**Validates: Requirements 11.6**

### Property 73: New User Welcome Display
*For any* new user, a welcome message and suggested first missions SHALL be displayed.
**Validates: Requirements 12.4**

### Property 74: Post-Onboarding Mission Display
*For any* user after onboarding, all available missions SHALL be displayed.
**Validates: Requirements 12.5**

### Property 75: Mission State Periodic Save
*For any* mission in progress, the current state SHALL be saved periodically.
**Validates: Requirements 13.1**

### Property 76: Mission State Final Save
*For any* mission being closed, the final state SHALL be saved.
**Validates: Requirements 13.2**

### Property 77: Mission State Restoration
*For any* mission being reopened, the previous state SHALL be restored.
**Validates: Requirements 13.3**

### Property 78: Completed Mission Lock
*For any* completed mission, the mission SHALL be marked as complete and re-editing SHALL be prevented.
**Validates: Requirements 13.4**

### Property 79: Mission Status Display
*For any* mission, its status (in progress or completed) SHALL be displayed on the dashboard.
**Validates: Requirements 13.5**

### Property 80: Terminal Error Display
*For any* error in the terminal, a clear error message SHALL be displayed.
**Validates: Requirements 14.1**

### Property 81: Git Operation Error Display
*For any* failed git operation, an error message explaining the failure SHALL be displayed.
**Validates: Requirements 14.2**

### Property 82: File Operation Error Display
*For any* failed file operation, an error message SHALL be displayed.
**Validates: Requirements 14.4**

### Property 83: Task Validation Failure Feedback
*For any* task validation failure, specific feedback about the failure SHALL be provided.
**Validates: Requirements 14.5**

### Property 84: Mission Category Organization
*For any* mission, it SHALL be organized into exactly one category (Git, Terminal, or Core).
**Validates: Requirements 15.1, 15.3**

### Property 85: Category Filter Display
*For any* category filter applied, only missions in that category SHALL be displayed.
**Validates: Requirements 15.2**

### Property 86: Mission Category Display
*For any* mission viewed, its category SHALL be displayed.
**Validates: Requirements 15.4**

### Property 87: Category Progress Tracking
*For any* category, progress SHALL be tracked and displayed based on completed missions.
**Validates: Requirements 15.5**

## Error Handling

### Error Categories

1. **File System Errors**
   - File not found
   - Permission denied
   - Invalid path
   - Directory already exists

2. **Git Errors**
   - Repository not initialized
   - Merge conflicts
   - Invalid branch name
   - Commit not found

3. **Terminal Errors**
   - Command not found
   - Invalid arguments
   - Command execution failure
   - Permission denied

4. **Vim Editor Errors**
   - File not found
   - Unsaved changes
   - Invalid mode transition

5. **API Errors**
   - Gemini API timeout
   - Network error
   - Invalid request
   - Rate limiting

6. **Validation Errors**
   - Task validation failed
   - Invalid input
   - State mismatch

### Error Recovery Strategies

- Display user-friendly error messages
- Provide recovery options (retry, cancel, reset)
- Log errors for debugging
- Maintain system state consistency
- Allow users to continue after errors

## Testing Strategy

### Unit Testing

Unit tests validate specific examples, edge cases, and error conditions:

- File system operations (create, read, update, delete)
- Git operations (init, add, commit, branch, merge)
- Terminal command parsing and execution
- Vim editor mode transitions and operations
- Task validation logic
- XP and level calculations
- Environment variable substitution
- Error handling and recovery

### Property-Based Testing

Property-based tests validate universal properties across all inputs using a PBT library (Vitest with fast-check for TypeScript):

- **Minimum 100 iterations per property test**
- Each property test references its design document property
- Tag format: `Feature: devquest, Property {number}: {property_text}`
- Properties cover:
  - Data consistency (file system, git state, user progress)
  - State transitions (task completion, mission completion)
  - API interactions (Gemini, localStorage)
  - UI rendering (mission display, task display)
  - Command execution (terminal, vim)

### Test Organization

```
tests/
├── unit/
│   ├── fileSystem.test.ts
│   ├── gitEngine.test.ts
│   ├── terminal.test.ts
│   ├── vimEditor.test.ts
│   ├── taskChecker.test.ts
│   ├── userProgress.test.ts
│   └── geminiService.test.ts
├── properties/
│   ├── missionDisplay.properties.test.ts
│   ├── fileSystem.properties.test.ts
│   ├── gitEngine.properties.test.ts
│   ├── terminal.properties.test.ts
│   ├── taskValidation.properties.test.ts
│   ├── userProgress.properties.test.ts
│   └── stateManagement.properties.test.ts
└── integration/
    ├── missionFlow.test.ts
    └── endToEnd.test.ts
```

### Test Coverage Goals

- Unit tests: 80% code coverage
- Property tests: All testable acceptance criteria
- Integration tests: Critical user flows
- Error scenarios: All error paths

### Continuous Testing

- Run unit tests on every commit
- Run property tests with 100+ iterations
- Run integration tests before release
- Monitor test performance and flakiness
