import { GoogleGenAI } from "@google/genai";
import { GameState, TerminalLine } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const TUTOR_SYSTEM_INSTRUCTION = `
You are DevQuest, an elite AI coding tutor. 
Your goal is to teach Git, Bash, and Dev fundamentals in a fun, Gen-Z friendly, gamified way.
Tone: Energetic, encouraging, concise. Use tech metaphors.

CRITICAL INSTRUCTIONS:
1. Analyze the User's State (File System, Git Graph, Command History).
2. If the user is stuck, give a "Hint Level 1" (vague). If they ask again, "Hint Level 2" (specific).
3. If they make a mistake, explain WHY it failed before showing the fix.
4. Keep responses short (max 3 sentences) unless explaining a complex concept.
`;

export const getTutorResponse = async (
  query: string, 
  gameState: GameState, 
  terminalHistory: TerminalLine[],
  currentTaskDescription: string
): Promise<string> => {
  if (!apiKey) return "⚠️ API Key missing. Please set process.env.API_KEY in your environment.";

  // Serialize State for Context
  const recentHistory = terminalHistory.slice(-8).map(l => `[${l.type}] ${l.content}`).join('\n');
  const gitStateSummary = {
      HEAD: gameState.git.HEAD,
      branches: gameState.git.branches,
      staging: gameState.git.staging,
      recentCommits: gameState.git.commits.slice(-3).map(c => ({ id: c.id, msg: c.message }))
  };
  const fsStructure = Object.keys(gameState.fileSystem['project']?.children || {}).join(', ');

  const prompt = `
    [CURRENT MISSION OBJECTIVE]
    ${currentTaskDescription}

    [SYSTEM STATE]
    CWD: ${gameState.cwd}
    Files in /project: ${fsStructure}
    Git Status: ${JSON.stringify(gitStateSummary)}

    [TERMINAL HISTORY]
    ${recentHistory}

    [USER QUERY]
    "${query}"
    
    Respond as the DevQuest AI Tutor.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 1024 } // Use thinking for better reasoning on state
      }
    });
    return response.text || "Systems offline... try again?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "❌ Connection interrupted. The mainframe is acting up.";
  }
};

export const checkMissionSuccess = async (
  missionTitle: string,
  userActions: string[]
): Promise<string> => {
   if (!apiKey) return "Great job! (AI Offline)";
   
   const prompt = `The user just completed the mission "${missionTitle}". 
   Their key actions were: ${userActions.join(', ')}.
   Give them a short, high-energy congratulatory message and 1 specific pro-tip related to what they practiced.`;

   try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Mission Complete! You rock.";
   } catch (error) {
     return "Mission Complete! +XP";
   }
}