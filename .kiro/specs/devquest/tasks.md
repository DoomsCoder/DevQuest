# Implementation Plan: DevQuest

## Overview

This implementation plan breaks down the DevQuest platform into discrete, incremental coding tasks. The approach follows a layered architecture: first establishing core data models and services, then building UI components, integrating external services, and finally implementing comprehensive testing. Each task builds on previous work with no orphaned code.

## Tasks

- [ ] 1. Set up project structure and core types
  - Create TypeScript interfaces for all data models (Mission, Task, UserProgress, MissionState, etc.)
  - Define service interfaces (FileSystemService, GitEngineService, TerminalService, etc.)
  - Set up state management structure with Zustand or Context API
  - Create utility types and enums for categories, difficulty levels, and modes
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 15.1_

- [ ] 2. Implement File System Simulator
  - [ ] 2.1 Create FileSystemService with core operations
    - Implement createFile, readFile, updateFile, deleteFile operations
    - Implement createDirectory and listDirectory operations
    - Implement changeDirectory and getCurrentDirectory for navigation
    - Store file metadata (createdAt, modifiedAt, permissions, owner)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.2 Write property tests for File System operations
    - **Property 10: File Creation Persistence**
    - **Property 11: File Modification Consistency**
    - **Property 12: File Deletion Correctness**
    - **Property 13: Directory Navigation State**
    - **Property 14: File System State Persistence**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.7, 3.8**

  - [ ] 2.3 Implement file system state persistence and restoration
    - Add getFileSystemState and restoreFileSystemState methods
    - Serialize/deserialize file system to/from JSON
    - _Requirements: 3.8, 13.1, 13.2, 13.3_

- [ ] 3. Implement Git Engine Simulator
  - [ ] 3.1 Create GitEngineService with repository initialization
    - Implement init() to create .git directory and metadata
    - Initialize commits array, branches map, and staging area
    - Set default branch to 'main'
    - _Requirements: 4.1, 4.2_

  - [ ] 3.2 Implement Git staging and commit operations
    - Implement add() to stage files
    - Implement commit() to create commit objects with message, author, timestamp, and file snapshot
    - Track parent commits for history
    - _Requirements: 4.3, 4.4_

  - [ ]* 3.3 Write property tests for Git staging and commits
    - **Property 16: Git Add Staging**
    - **Property 17: Git Commit Completeness**
    - **Validates: Requirements 4.3, 4.4**

  - [ ] 3.4 Implement Git branch operations
    - Implement branch() for create, delete, and list operations
    - Implement checkout() to switch branches and update HEAD
    - Maintain branch pointers correctly
    - _Requirements: 4.5, 4.6_

  - [ ]* 3.5 Write property tests for Git branch operations
    - **Property 18: Git Branch Creation**
    - **Property 19: Git Checkout Correctness**
    - **Validates: Requirements 4.5, 4.6**

  - [ ] 3.6 Implement Git merge operations
    - Implement merge() to merge branches
    - Handle merge conflicts (mark conflicted files)
    - Create merge commit with both parents
    - _Requirements: 4.7_

  - [ ]* 3.7 Write property tests for Git merge
    - **Property 20: Git Merge History**
    - **Validates: Requirements 4.7**

  - [ ] 3.8 Implement Git remote operations
    - Implement addRemote() to manage remote references
    - Implement push() to simulate pushing to remote
    - Track remote state separately
    - _Requirements: 4.8, 4.9_

  - [ ]* 3.9 Write property tests for Git remote operations
    - **Property 21: Git Push Remote Update**
    - **Property 22: Git Remote Management**
    - **Validates: Requirements 4.8, 4.9**

  - [ ] 3.10 Implement Git state persistence
    - Add getGitState and restoreGitState methods
    - Serialize/deserialize git state to/from JSON
    - _Requirements: 4.10, 13.1, 13.2, 13.3_

- [ ] 4. Implement Terminal Emulator
  - [ ] 4.1 Create TerminalService with command parsing
    - Implement parseCommand() to parse command and arguments
    - Support basic commands: cd, ls, cat, mkdir, touch, rm, echo
    - Handle command arguments and flags
    - _Requirements: 5.1, 5.2_

  - [ ] 4.2 Implement command execution against file system
    - Implement executeCommand() to run commands
    - Integrate with FileSystemService for file operations
    - Return command output and exit code
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 4.3 Write property tests for Terminal command execution
    - **Property 24: Command Parsing Correctness**
    - **Property 25: Command Execution File System Sync**
    - **Property 26: Successful Command Output Display**
    - **Property 27: Failed Command Error Display**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

  - [ ] 4.4 Implement specific command handlers
    - Implement cd command with directory validation
    - Implement ls command to list directory contents
    - Implement cat command to display file content
    - Implement mkdir, touch, rm, echo commands
    - _Requirements: 5.6, 5.7, 5.8, 5.9_

  - [ ]* 4.5 Write property tests for specific commands
    - **Property 28: Unknown Command Error**
    - **Property 29: Directory Change Correctness**
    - **Property 30: Directory Listing Completeness**
    - **Property 31: File Content Display**
    - **Validates: Requirements 5.6, 5.7, 5.8, 5.9**

  - [ ] 4.6 Implement environment variable support
    - Add environment variable storage and retrieval
    - Implement variable substitution in commands
    - Support export and unset commands
    - _Requirements: 5.10, 11.2, 11.3_

  - [ ]* 4.7 Write property tests for environment variables
    - **Property 32: Environment Variable Substitution**
    - **Property 68: Environment Variable Storage**
    - **Property 69: Environment Variable Substitution in Commands**
    - **Validates: Requirements 5.10, 11.2, 11.3**

- [ ] 5. Implement Vim Editor Simulator
  - [ ] 5.1 Create VimEditorService with mode management
    - Implement mode transitions (normal, insert, command)
    - Track cursor position and clipboard
    - Implement basic normal mode commands (dd, yy, p)
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.2 Write property tests for Vim mode transitions
    - **Property 33: Vim Insert Mode Entry**
    - **Property 34: Vim Normal Mode Return**
    - **Validates: Requirements 6.2, 6.3**

  - [ ] 5.3 Implement Vim file operations
    - Implement :w (save) command
    - Implement :q (quit) command with unsaved changes check
    - Implement :wq (save and quit) command
    - Implement :q! (force quit) command
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.4 Write property tests for Vim file operations
    - **Property 35: Vim File Save**
    - **Property 36: Vim Quit Without Changes**
    - **Property 37: Vim Save and Quit**
    - **Property 38: Vim Force Quit**
    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7**

  - [ ] 5.5 Implement Vim editing operations
    - Implement dd (delete line) command
    - Implement yy (copy line) command
    - Implement p (paste) command
    - Integrate with file system for saving
    - _Requirements: 6.8, 6.9, 6.10_

  - [ ]* 5.6 Write property tests for Vim editing
    - **Property 39: Vim Line Deletion**
    - **Property 40: Vim Line Copy**
    - **Property 41: Vim Content Paste**
    - **Validates: Requirements 6.8, 6.9, 6.10**

- [ ] 6. Implement Task Validation System
  - [ ] 6.1 Create TaskCheckerService with validation logic
    - Implement validateTask() to evaluate task actions
    - Support file, git, command, and custom validators
    - Return validation results with specific feedback
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 6.2 Implement specific validation types
    - Implement file existence and content checks
    - Implement git state validation (commits, branches, staging)
    - Implement command output validation
    - _Requirements: 7.5, 7.6, 7.7_

  - [ ]* 6.3 Write property tests for task validation
    - **Property 42: Task Validation Evaluation**
    - **Property 43: Task Completion Marking**
    - **Property 44: File Task Validation**
    - **Property 45: Git Task Validation**
    - **Property 46: Command Task Validation**
    - **Validates: Requirements 7.2, 7.3, 7.5, 7.6, 7.7**

  - [ ] 6.4 Implement XP award logic
    - Award XP when tasks are completed
    - Award XP when missions are completed
    - _Requirements: 7.8, 2.6_

  - [ ]* 6.5 Write property tests for XP awards
    - **Property 47: Task Completion XP Award**
    - **Property 9: Mission Completion XP Award**
    - **Validates: Requirements 7.8, 2.6**

- [ ] 7. Implement User Progress Tracking
  - [ ] 7.1 Create UserProgressService
    - Track total XP, level, streak, and completed missions
    - Implement XP accumulation logic
    - Implement level calculation based on XP thresholds
    - _Requirements: 8.1, 8.2_

  - [ ]* 7.2 Write property tests for XP and level
    - **Property 48: XP Accumulation**
    - **Property 49: Level Calculation Correctness**
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 7.3 Implement streak tracking
    - Track consecutive days of mission completion
    - Reset streak when a day is missed
    - _Requirements: 8.3, 8.4_

  - [ ]* 7.4 Write property tests for streak tracking
    - **Property 50: Streak Increment**
    - **Property 51: Streak Reset**
    - **Validates: Requirements 8.3, 8.4**

  - [ ] 7.5 Implement badge system
    - Define badge criteria and unlock conditions
    - Award badges when criteria are met
    - Track badge unlock dates
    - _Requirements: 8.5_

  - [ ]* 7.6 Write property tests for badges
    - **Property 52: Badge Award Correctness**
    - **Validates: Requirements 8.5**

  - [ ] 7.7 Implement progress persistence
    - Persist user progress to localStorage
    - Restore progress on app load
    - _Requirements: 8.7, 8.8_

  - [ ]* 7.8 Write property tests for progress persistence
    - **Property 53: Profile Display Completeness**
    - **Property 54: Mission Completion Persistence**
    - **Property 55: Progress Restoration**
    - **Validates: Requirements 8.6, 8.7, 8.8**

- [ ] 8. Implement Gemini AI Tutor Integration
  - [ ] 8.1 Create GeminiService with API integration
    - Implement sendMessage() to send messages to Gemini API
    - Include mission context in API requests
    - Handle API responses and errors
    - _Requirements: 9.2, 9.3, 9.6_

  - [ ]* 8.2 Write property tests for Gemini integration
    - **Property 57: Message Sending to API**
    - **Property 58: API Response Display**
    - **Property 59: Mission Context Inclusion**
    - **Validates: Requirements 9.2, 9.3, 9.6**

  - [ ] 8.3 Implement hint and explanation methods
    - Implement getHint() for task-specific hints
    - Implement explainConcept() for concept explanations
    - Ensure hints don't give away complete solutions
    - _Requirements: 9.4, 9.5_

  - [ ] 8.4 Implement error handling and retry logic
    - Handle API timeouts and failures
    - Display error messages and allow retry
    - _Requirements: 9.7_

  - [ ]* 8.5 Write property tests for error handling
    - **Property 60: API Failure Error Display**
    - **Validates: Requirements 9.7**

  - [ ] 8.6 Implement chat history persistence
    - Store chat messages for each mission
    - Restore chat history when mission is reopened
    - _Requirements: 9.8_

  - [ ]* 8.7 Write property tests for chat history
    - **Property 61: Chat History Persistence**
    - **Validates: Requirements 9.8**

- [ ] 9. Implement Git Graph Visualization
  - [ ] 9.1 Create GitGraphService
    - Generate graph data from git state
    - Track commits, branches, and merge relationships
    - Calculate positions for graph rendering
    - _Requirements: 4.10, 10.1_

  - [ ] 9.2 Implement graph update logic
    - Update graph after each git operation
    - Reflect commits, branches, and merges
    - Highlight HEAD position
    - _Requirements: 10.2, 10.3, 10.4, 10.7_

  - [ ]* 9.3 Write property tests for git graph
    - **Property 23: Git Graph Update Consistency**
    - **Property 62: Git Graph State Reflection**
    - **Property 63: Commit Display Completeness**
    - **Property 64: Branch Display**
    - **Property 65: Merge Display**
    - **Property 66: Multi-Branch Display**
    - **Property 67: HEAD Highlighting**
    - **Validates: Requirements 4.10, 10.1, 10.2, 10.3, 10.4, 10.6, 10.7**

- [ ] 10. Implement Environment Variable Management
  - [ ] 10.1 Create EnvironmentVariablesService
    - Store and retrieve environment variables
    - Support set, get, and unset operations
    - Integrate with terminal for variable substitution
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

  - [ ]* 10.2 Write property tests for environment variables
    - **Property 70: Environment Variable Display**
    - **Property 71: Environment Variable Removal**
    - **Property 72: Environment State Persistence**
    - **Validates: Requirements 11.4, 11.5, 11.6**

  - [ ] 10.3 Implement environment state persistence
    - Persist environment variables to mission state
    - Restore environment on mission load
    - _Requirements: 11.6, 13.1, 13.2, 13.3_

- [ ] 11. Implement Mission State Management
  - [ ] 11.1 Create MissionStateService
    - Manage mission state (file system, git, env vars, tasks)
    - Implement periodic state saving
    - Implement state restoration on mission load
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 11.2 Write property tests for mission state
    - **Property 75: Mission State Periodic Save**
    - **Property 76: Mission State Final Save**
    - **Property 77: Mission State Restoration**
    - **Property 78: Completed Mission Lock**
    - **Property 79: Mission Status Display**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

  - [ ] 11.3 Implement mission completion logic
    - Mark missions as complete when all tasks are done
    - Prevent re-editing of completed missions
    - Award mission XP
    - _Requirements: 2.6, 13.4_

- [ ] 12. Implement Error Handling and Recovery
  - [ ] 12.1 Create error handling utilities
    - Define error types and messages
    - Implement error boundary component
    - Implement error recovery options
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 12.2 Write property tests for error handling
    - **Property 80: Terminal Error Display**
    - **Property 81: Git Operation Error Display**
    - **Property 82: File Operation Error Display**
    - **Property 83: Task Validation Failure Feedback**
    - **Validates: Requirements 14.1, 14.2, 14.4, 14.5**

- [ ] 13. Build React Components - Dashboard and Mission Browser
  - [ ] 13.1 Create Dashboard component
    - Display mission browser with grid/list layout
    - Show user profile with XP, level, streak, badges
    - Implement category and difficulty filters
    - Implement search functionality
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.6_

  - [ ]* 13.2 Write property tests for dashboard display
    - **Property 1: Mission Display Completeness**
    - **Property 2: Category Filter Correctness**
    - **Property 3: Difficulty Filter Correctness**
    - **Property 4: Search Result Accuracy**
    - **Property 84: Mission Category Organization**
    - **Property 85: Category Filter Display**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 15.1, 15.2**

  - [ ] 13.3 Create MissionBrowser component
    - Display missions with filtering and search
    - Handle mission selection and navigation
    - Show mission metadata (category, difficulty, XP)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 13.4 Create UserProfile component
    - Display user progress (XP, level, streak)
    - Display earned badges
    - Show mission completion status
    - _Requirements: 8.6, 13.5_

- [ ] 14. Build React Components - Mission View
  - [ ] 14.1 Create MissionView component
    - Display mission title, description, and tasks
    - Manage mission state and task progress
    - Coordinate between sub-components
    - _Requirements: 2.1, 2.2_

  - [ ] 14.2 Create TaskPanel component
    - Display task description and acceptance criteria
    - Show task completion status
    - Trigger task validation
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 14.3 Write property tests for task display
    - **Property 5: Task Display Completeness**
    - **Property 6: Task Validation Execution**
    - **Property 7: Successful Task Completion**
    - **Property 8: Task Validation Failure Feedback**
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

  - [ ] 14.4 Create FileExplorer component
    - Display file system tree
    - Show current working directory
    - Allow file selection and viewing
    - _Requirements: 3.1, 3.7_

- [ ] 15. Build React Components - Terminal and Vim
  - [ ] 15.1 Create Terminal component
    - Display terminal prompt and history
    - Handle command input and execution
    - Display command output and errors
    - Integrate with TerminalService
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 15.2 Create VimEditor component
    - Display file content with syntax highlighting
    - Handle mode transitions and key input
    - Display mode indicator and status line
    - Integrate with VimEditorService
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ] 15.3 Create GitGraph component
    - Render git commit graph
    - Display commits, branches, and merges
    - Show commit details on hover
    - Integrate with GitGraphService
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 15.4 Create EnvVisualizer component
    - Display environment variables
    - Show variable names and values
    - Allow variable inspection
    - _Requirements: 11.4_

- [ ] 16. Build React Components - AI Tutor and Landing
  - [ ] 16.1 Create TutorChat component
    - Display chat interface with message history
    - Handle user message input
    - Display AI responses
    - Integrate with GeminiService
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 9.8_

  - [ ] 16.2 Create Landing component
    - Display hero section with title and description
    - Show "Initialize Training" button
    - Handle navigation to dashboard
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 16.3 Create ErrorBoundary component
    - Catch and display errors
    - Provide recovery options
    - Log errors for debugging
    - _Requirements: 14.6_

- [ ] 17. Integrate all components and wire state management
  - [ ] 17.1 Set up global state with Zustand or Context API
    - Create store for game state, user progress, mission state
    - Implement state selectors and actions
    - _Requirements: All_

  - [ ] 17.2 Wire Dashboard to state
    - Connect mission browser to mission data
    - Connect user profile to user progress
    - Implement filter and search logic
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.6_

  - [ ] 17.3 Wire MissionView to state
    - Connect task panel to task data
    - Connect terminal to terminal service
    - Connect vim editor to vim service
    - Connect git graph to git state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 17.4 Implement mission loading and saving
    - Load mission data on mission selection
    - Save mission state periodically
    - Restore mission state on reload
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 17.5 Implement user progress persistence
    - Save user progress to localStorage
    - Restore user progress on app load
    - Update progress on mission completion
    - _Requirements: 8.7, 8.8_

- [ ] 18. Checkpoint - Ensure all core functionality works
  - Verify all services are working correctly
  - Verify all components render properly
  - Verify state management is functioning
  - Test basic mission flow end-to-end
  - Ask the user if questions arise

- [ ] 19. Create mission data and fixtures
  - [ ] 19.1 Create sample missions for each category
    - Create Git beginner missions
    - Create Terminal beginner missions
    - Create Core beginner missions
    - _Requirements: 1.1, 15.1_

  - [ ] 19.2 Create mission fixtures for testing
    - Create test missions with known tasks
    - Create test file systems and git states
    - _Requirements: All_

- [ ] 20. Write comprehensive integration tests
  - [ ] 20.1 Test complete mission flows
    - Test git mission flow (init, add, commit)
    - Test terminal mission flow (file operations)
    - Test task validation and completion
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 20.2 Test user progress flows
    - Test XP accumulation and level up
    - Test streak tracking
    - Test badge awarding
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 20.3 Test state persistence flows
    - Test mission state save and restore
    - Test user progress persistence
    - Test chat history persistence
    - _Requirements: 13.1, 13.2, 13.3, 8.7, 8.8, 9.8_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property tests (minimum 100 iterations each)
  - Run all integration tests
  - Verify test coverage meets goals
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of functionality
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- All services are designed to be testable and mockable
- State management is centralized for easier testing and debugging
