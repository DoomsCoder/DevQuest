import { GoogleGenAI } from "@google/genai";
import { GameState, TerminalLine, UserProgress } from "../types";

// Lazy initialization - don't create client at module load time
const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY || '';

let aiClient: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI | null => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (error) {
      console.error("Failed to initialize Gemini client:", error);
      return null;
    }
  }
  return aiClient;
};

// ===== SYSTEM PROMPTS =====

const TUTOR_SYSTEM_INSTRUCTION = `
You are DevQuest, an elite AI coding tutor specializing in Git, Linux, and developer fundamentals.

PERSONALITY:
• Energetic, encouraging, and beginner-friendly
• Use tech metaphors and gamified language
• Be concise but technically accurate

ANALYSIS RULES:
1. When a command fails, first explain WHY it failed
2. Then show the CORRECT command with code formatting
3. Teach the underlying concept briefly
4. Guide toward the current mission objective

RESPONSE FORMAT:
• Keep responses short (2-4 sentences max) unless explaining a concept
• Format commands in backticks: \`git checkout -b feature\`
• Use emojis sparingly for encouragement 🎯

NEVER:
• Give full solutions immediately - guide learners to discover
• Be condescending about mistakes
• Use overly technical jargon without explanation
`;

const MISSION_CONTEXT_PROMPTS: Record<string, string> = {
  'Operation Genesis': 'Focus on teaching: git init, git add, git commit basics. This is likely a first-time Git user.',
  'The Hydra Merge': 'Focus on teaching: branching, merging, conflict resolution. User should understand basic commits.',
  'Cloud Uplink': 'Focus on teaching: git remote, git push, remote tracking. User should understand local commits.',
  'Stash Ninja': 'Focus on teaching: git stash, stash pop, temporary storage of work.',
  'Reset Lab': 'Focus on teaching: git reset, git revert, undoing changes safely.',
  'Log Explorer': 'Focus on teaching: git log, commit history navigation, oneline format.',
};

// ===== INTERFACES =====

export interface ShellContext {
  missionName: string;
  currentObjective: string;
  userCommand: string;
  terminalOutput: string;
  outputType: 'success' | 'error' | 'info' | 'git-status' | 'git-branch';
  repoState: {
    branches: string[];
    currentBranch: string;
    stagedFiles: string[];
    modifiedFiles: string[];
    untrackedFiles: string[];
    commits: number;
    repoInitialized: boolean;
  };
}

export interface AIResponse {
  message: string;
  suggestedCommand?: string;
  conceptExplanation?: string;
  shouldAutoDisplay: boolean;
}

// ===== PUBLIC FUNCTIONS =====

// Check if AI is available (for UI to show status)
export const isAIAvailable = (): boolean => {
  return !!getApiKey();
};

/**
 * Analyze a shell command and provide contextual guidance
 * This is triggered automatically after command execution
 */
export const analyzeShellCommand = async (
  context: ShellContext
): Promise<AIResponse> => {
  const ai = getAIClient();

  // Determine if we should auto-display (errors warrant attention)
  const isError = context.outputType === 'error';
  const hasGitError = context.terminalOutput.toLowerCase().includes('fatal:') ||
    context.terminalOutput.toLowerCase().includes('error:');

  if (!ai) {
    // Offline fallback with basic rule-based hints
    if (isError || hasGitError) {
      return {
        message: "🔌 AI Tutor offline. Check your command syntax and try again!",
        shouldAutoDisplay: true
      };
    }
    return { message: "", shouldAutoDisplay: false };
  }

  // Don't auto-analyze successful commands (unless user asks)
  if (!isError && !hasGitError) {
    return { message: "", shouldAutoDisplay: false };
  }

  const missionHint = MISSION_CONTEXT_PROMPTS[context.missionName] || '';

  const prompt = `
[MISSION: ${context.missionName}]
${missionHint}

[CURRENT OBJECTIVE]
${context.currentObjective}

[USER'S COMMAND]
\`${context.userCommand}\`

[TERMINAL OUTPUT - ${context.outputType.toUpperCase()}]
${context.terminalOutput}

[REPOSITORY STATE]
• Initialized: ${context.repoState.repoInitialized ? 'Yes' : 'No'}
• Current Branch: ${context.repoState.currentBranch}
• Branches: ${context.repoState.branches.join(', ') || 'none'}
• Staged: ${context.repoState.stagedFiles.length} file(s)
• Modified: ${context.repoState.modifiedFiles.length} file(s)
• Untracked: ${context.repoState.untrackedFiles.length} file(s)
• Total Commits: ${context.repoState.commits}

TASK: Analyze why this command ${isError || hasGitError ? 'failed' : 'may not have achieved the desired result'}. 
Provide:
1. Brief explanation of the error
2. The correct command to use (if applicable)
3. Connection to the current mission objective
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      }
    });

    const responseText = response.text || "Let me help you with that...";

    // Extract suggested command from response (looks for backticks)
    const commandMatch = responseText.match(/`([^`]+)`/);
    const suggestedCommand = commandMatch ? commandMatch[1] : undefined;

    return {
      message: responseText,
      suggestedCommand: suggestedCommand?.startsWith('git') || suggestedCommand?.startsWith('touch') || suggestedCommand?.startsWith('mkdir')
        ? suggestedCommand
        : undefined,
      shouldAutoDisplay: true
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      message: "❌ Connection interrupted. Try running the command again!",
      shouldAutoDisplay: true
    };
  }
};

/**
 * Get tutor response for user queries (chat-based)
 */
export const getTutorResponse = async (
  query: string,
  gameState: GameState,
  terminalHistory: TerminalLine[],
  currentTaskDescription: string,
  userProgress?: UserProgress | null
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "🔌 AI Tutor is offline — add your Gemini API key in .env.local as VITE_GEMINI_API_KEY for the full experience!";

  // Serialize State for Context
  const recentHistory = terminalHistory.slice(-8).map(l => `[${l.type}] ${l.content}`).join('\n');
  const gitStateSummary = {
    HEAD: gameState.git.HEAD,
    branches: Object.keys(gameState.git.branches),
    staging: gameState.git.staging,
    recentCommits: gameState.git.commits.slice(-3).map(c => ({ id: c.id, msg: c.message }))
  };
  const fsStructure = Object.keys(gameState.fileSystem['project']?.children || {}).join(', ');

  const levelContext = userProgress
    ? `[USER STATS] User Level: ${userProgress.level}, Streak: ${userProgress.streak}, XP: ${userProgress.xp}. 
       ADAPT TONE: ${userProgress.level > 3 ? 'Professional, concise peer-to-peer style.' : 'Encouraging, helpful mentor style.'}`
    : '[USER STATS] Unknown level (assume beginner).';

  const prompt = `
[CURRENT MISSION OBJECTIVE]
${currentTaskDescription}

[SYSTEM STATE]
CWD: ${gameState.cwd}
Files in /project: ${fsStructure}
Git Status: ${JSON.stringify(gitStateSummary)}

[TERMINAL HISTORY]
${recentHistory}

${levelContext}

[USER QUERY]
"${query}"

Respond as the DevQuest AI Tutor. Be helpful but guide the learner to discover solutions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
      }
    });
    return response.text || "Systems offline... try again?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "❌ Connection interrupted. The mainframe is acting up.";
  }
};

/**
 * Generate congratulatory message on mission completion
 */
export const checkMissionSuccess = async (
  missionTitle: string,
  userActions: string[]
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "🎉 Great job completing the mission!";

  const prompt = `The user just completed the mission "${missionTitle}".  
Their key actions were: ${userActions.slice(-5).join(', ')}.
Give them a short, high-energy congratulatory message (1-2 sentences) and 1 specific pro-tip related to what they practiced.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || "Mission Complete! You rock.";
  } catch (error) {
    return "🎉 Mission Complete! +XP";
  }
}