import React, { useState, useEffect, useRef } from 'react';
import Terminal from './Terminal';
import GitGraph from './GitGraph';
import TutorChat from './TutorChat';
import EnvVisualizer from './EnvVisualizer';
import FileSystemTree from './FileSystemTree';
import VimEditor from './VimEditor';
import { executeCommand, INITIAL_STATE } from '../services/gitEngine';
import { GameState, TerminalLine, Mission, SavedMissionState, UserProgress } from '../types';
import MissionLayout from './MissionLayout';
import { v4 as uuidv4 } from 'uuid';
import { checkMissionSuccess, analyzeShellCommand, ShellContext, AIResponse } from '../services/geminiService';
import { ArrowLeft, CheckCircle, FolderTree, Terminal as TerminalIcon, Trophy, BookOpen, X, RotateCcw, Save, Play, Eye, Pause, FastForward, SkipForward } from 'lucide-react';
import ShortcutHelpModal from './ShortcutHelpModal';

interface MissionViewProps {
    mission: Mission;
    onExit: () => void;
    onComplete: (xp: number) => void;
    userProgress?: UserProgress | null;
}

const MissionView: React.FC<MissionViewProps> = ({ mission, onExit, onComplete, userProgress }) => {
    // --- STATE INITIALIZATION ---
    const initialHistory: TerminalLine[] = [
        { id: 'init', type: 'info', content: `SYSTEM INITIALIZED...\nMission: ${mission.title}\n${mission.description}\n` }
    ];

    const [gameState, setGameState] = useState<GameState>({
        ...INITIAL_STATE,
        fileSystem: JSON.parse(JSON.stringify(mission.initialFileSystem))
    });

    const [history, setHistory] = useState<TerminalLine[]>(initialHistory);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [missionComplete, setMissionComplete] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [showBriefing, setShowBriefing] = useState(!!mission.theory);
    const [isReplaying, setIsReplaying] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AIResponse | null>(null);

    // --- LAYOUT STATE ---
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [terminalCollapsed, setTerminalCollapsed] = useState(false);
    const [visualizationCollapsed, setVisualizationCollapsed] = useState(false);
    const [aiChatCollapsed, setAiChatCollapsed] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // --- GLOBAL SHORTCUTS ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            // Toggle Shortcuts Help (?)
            // Allow this even if input focused? Yes, ? in terminal might be help command, but global ? is usually modal.
            // If input focused, '?' types a character.
            // Requirement: "Press “?” to open Keyboard Shortcut Guide."
            // If focused in shell, typing ? should probably type ?.
            // "Shortcuts must not interfere with browser defaults outside the shell."
            // "Scope events to shell container when focused."
            // But this is a global help modal. Use Shift+? globally if NOT focused?
            // Or maybe Ctrl+H? No, prompt says "?".
            // If I type `?` in terminal, I want `?`.
            // So only trigger if valid target OR if e.key === '?' AND NOT input?
            // Or maybe check if `e.target` is body?

            if (e.key === '?' && !isInput) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }

            if (isInput) return; // Stop other shortcuts if typing

            // Layout Toggles - Prevent default only if we handle it
            // Ctrl+B: Toggle Sidebar
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setSidebarCollapsed(prev => !prev);
            }
            // Ctrl+G: Toggle Repo Graph (Visualization)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                setVisualizationCollapsed(prev => !prev);
            }
            // Ctrl+/: Toggle AI Assistant
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                setAiChatCollapsed(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Replay engine state
    const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 4>(1);
    const [replayPaused, setReplayPaused] = useState(false);
    const [replayStep, setReplayStep] = useState(0);
    const [replayTotal, setReplayTotal] = useState(0);
    const replayPausedRef = useRef(false);
    const replaySpeedRef = useRef<1 | 2 | 4>(1);
    const skipStepRef = useRef(false);

    const activeTask = mission.tasks[activeTaskIndex];
    const mountedRef = useRef(false);

    // --- PERSISTENCE LOGIC ---
    // Load state on mount
    useEffect(() => {
        const savedData = localStorage.getItem(`dq_save_${mission.id}`);
        if (savedData) {
            try {
                const parsed: SavedMissionState = JSON.parse(savedData);
                if (parsed.missionId === mission.id && parsed.gameState) {
                    setGameState(parsed.gameState);
                    setHistory(parsed.history);
                    setActiveTaskIndex(parsed.activeTaskIndex);
                    setMissionComplete(parsed.completed);
                    if (parsed.completed) setIsReviewMode(true);
                }
            } catch (e) {
                console.error("Failed to load save", e);
            }
        }
        mountedRef.current = true;
    }, [mission.id]);

    // Save state on change
    useEffect(() => {
        if (!mountedRef.current || isReplaying) return;

        const saveState: SavedMissionState = {
            gameState,
            history,
            activeTaskIndex,
            missionId: mission.id,
            completed: missionComplete
        };
        localStorage.setItem(`dq_save_${mission.id}`, JSON.stringify(saveState));
    }, [gameState, history, activeTaskIndex, missionComplete, mission.id, isReplaying]);

    // --- GAMEPLAY LOGIC ---
    const handleCommand = async (cmd: string) => {
        if (isReplaying || gameState.activeEditor) return; // Block terminal input if editor is open

        const inputLine: TerminalLine = { id: uuidv4(), type: 'input', content: cmd };

        // --- COMMAND ENGINE EXECUTION ---
        const result = executeCommand(cmd, gameState);
        const { output, type, newState, structured } = result as any;

        // Track command in generic history
        newState.commandHistory = [...(newState.commandHistory || []), cmd];

        // Create output line with structured data for git commands
        const outputLine: TerminalLine = {
            id: uuidv4(),
            type,
            content: output,
            structured: structured // Preserve structured output for git status/branch
        };
        setHistory(prev => [...prev, inputLine, ...(output ? [outputLine] : [])]);
        setGameState(newState);

        // --- LIVE SHELL LISTENER: Trigger AI analysis on errors ---
        if (type === 'error' || output?.toLowerCase().includes('fatal:') || output?.toLowerCase().includes('error:')) {
            const shellContext: ShellContext = {
                missionName: mission.title,
                currentObjective: activeTask?.description || 'Complete mission objectives',
                userCommand: cmd,
                terminalOutput: output,
                outputType: type,
                repoState: {
                    branches: Object.keys(newState.git.branches),
                    currentBranch: newState.git.HEAD.type === 'branch' ? newState.git.HEAD.ref : 'detached',
                    stagedFiles: newState.git.staging || [],
                    modifiedFiles: newState.git.workingDirectory?.modified || [],
                    untrackedFiles: [],
                    commits: newState.git.commits.length,
                    repoInitialized: newState.git.repoInitialized
                }
            };

            // Analyze command asynchronously (don't block UI)
            analyzeShellCommand(shellContext).then(response => {
                if (response.shouldAutoDisplay) {
                    setAiAnalysis(response);
                }
            });
        }
    };

    // Handler for running commands suggested by AI
    const handleRunSuggestedCommand = (command: string) => {
        handleCommand(command);
    };

    const handleVimSave = (content: string) => {
        if (!gameState.activeEditor) return;
        const fileName = gameState.activeEditor.file;
        const newState = JSON.parse(JSON.stringify(gameState)); // Deep clone

        // Ensure workingDirectory exists
        if (!newState.git.workingDirectory) {
            newState.git.workingDirectory = { modified: [], deleted: [] };
        }
        if (!newState.git.trackedFiles) {
            newState.git.trackedFiles = [];
        }

        // Simple file update logic (assumes current directory for MVP)
        const fileNode = newState.fileSystem['project']?.children?.[fileName];
        const oldContent = fileNode?.content || '';

        if (fileNode) {
            fileNode.content = content;

            // If file is tracked and content changed, mark as modified
            if (newState.git.trackedFiles.includes(fileName) && oldContent !== content) {
                if (!newState.git.workingDirectory.modified.includes(fileName) &&
                    !newState.git.staging.includes(fileName)) {
                    newState.git.workingDirectory.modified.push(fileName);
                }
            }
        } else if (newState.fileSystem['project']?.children) {
            newState.fileSystem['project'].children[fileName] = {
                type: 'file',
                name: fileName,
                content: content
            };
        }
        setGameState(newState);
    };

    const handleVimExit = () => {
        const newState = { ...gameState };
        delete newState.activeEditor;
        setGameState(newState);

        // Add info message about exit
        setHistory(prev => [...prev, { id: uuidv4(), type: 'info', content: 'Vim session closed.' }]);
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset this mission? All progress will be lost.")) {
            localStorage.removeItem(`dq_save_${mission.id}`);
            setGameState({
                ...INITIAL_STATE,
                fileSystem: JSON.parse(JSON.stringify(mission.initialFileSystem))
            });
            setHistory(initialHistory);
            setActiveTaskIndex(0);
            setMissionComplete(false);
            setIsReviewMode(false);
            setSuccessMsg('');
            setShowBriefing(true);
        }
    };

    const handleReplay = async () => {
        if (isReplaying || gameState.commandHistory.length === 0) return;

        if (!window.confirm("Watch a replay of your mission execution?")) return;

        const actionsToReplay = [...gameState.commandHistory];
        setReplayTotal(actionsToReplay.length);
        setReplayStep(0);
        setReplayPaused(false);
        replayPausedRef.current = false;
        setIsReplaying(true);
        setIsReviewMode(false);
        setMissionComplete(false);

        // Reset State for replay visualization
        let replayState = {
            ...INITIAL_STATE,
            fileSystem: JSON.parse(JSON.stringify(mission.initialFileSystem))
        };
        setGameState(replayState);
        setHistory([{ id: 'replay-start', type: 'info', content: '▶ REPLAY MODE — Watching your past execution\n' }]);
        setActiveTaskIndex(0);

        // Helper for animated delay based on speed
        const getDelay = () => Math.round(1000 / replaySpeedRef.current);

        // Helper to wait for unpause
        const waitForUnpause = async () => {
            while (replayPausedRef.current) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        for (let i = 0; i < actionsToReplay.length; i++) {
            const cmd = actionsToReplay[i];
            setReplayStep(i + 1);

            // Wait if paused
            await waitForUnpause();

            // Skip step if requested
            if (skipStepRef.current) {
                skipStepRef.current = false;
            } else {
                // Typing animation - show command being typed character by character
                let typedCmd = '';
                for (const char of cmd) {
                    await waitForUnpause();
                    typedCmd += char;
                    setHistory(prev => {
                        const filtered = prev.filter(h => h.id !== 'typing-line');
                        return [...filtered, { id: 'typing-line', type: 'input', content: `${typedCmd}▌` }];
                    });
                    await new Promise(resolve => setTimeout(resolve, getDelay() / 10));
                }

                // Small pause before executing
                await new Promise(resolve => setTimeout(resolve, getDelay() / 2));
            }

            // Execute command
            const inputLine: TerminalLine = { id: uuidv4(), type: 'input', content: cmd };
            setHistory(prev => [...prev.filter(h => h.id !== 'typing-line'), inputLine]);

            const result = executeCommand(cmd, replayState);
            const { output, type, newState, structured } = result as any;

            if (output) {
                const outputLine: TerminalLine = { id: uuidv4(), type, content: output, structured };
                setHistory(prev => [...prev, outputLine]);
            }

            // Update state
            setGameState(newState);
            replayState = newState;

            // Check for task completion during replay
            const currentTask = mission.tasks[activeTaskIndex];
            if (currentTask && currentTask.check(newState)) {
                const nextIndex = activeTaskIndex + 1;
                if (nextIndex < mission.tasks.length) {
                    setActiveTaskIndex(nextIndex);
                }
            }

            // Delay between commands
            await new Promise(resolve => setTimeout(resolve, getDelay()));
        }

        // Replay complete - preserve the command history for future replays
        replayState.commandHistory = actionsToReplay;
        setGameState(replayState);

        setHistory(prev => [...prev, { id: 'replay-end', type: 'success', content: '\n✅ REPLAY COMPLETE — You can now interact with the mission again.' }]);
        setIsReplaying(false);
        setMissionComplete(true);
        setIsReviewMode(true);
        setReplayStep(0);
    };

    // Replay control handlers
    const toggleReplayPause = () => {
        const newPaused = !replayPaused;
        setReplayPaused(newPaused);
        replayPausedRef.current = newPaused;
    };

    const changeReplaySpeed = () => {
        const speeds: (1 | 2 | 4)[] = [1, 2, 4];
        const currentIndex = speeds.indexOf(replaySpeed);
        const newSpeed = speeds[(currentIndex + 1) % speeds.length];
        setReplaySpeed(newSpeed);
        replaySpeedRef.current = newSpeed;
    };

    const skipReplayStep = () => {
        skipStepRef.current = true;
    };

    // --- MISSION OBJECTIVE CHECKER ---
    useEffect(() => {
        if (!missionComplete && !isReplaying && activeTask && activeTask.check(gameState)) {
            const nextIndex = activeTaskIndex + 1;

            setHistory(prev => [...prev, {
                id: uuidv4(),
                type: 'success',
                content: `>> OBJECTIVE COMPLETED: ${activeTask.description}`
            }]);

            if (nextIndex < mission.tasks.length) {
                setActiveTaskIndex(nextIndex);
            } else {
                setMissionComplete(true);
                onComplete(mission.xp);
                const actions = history.filter(h => h.type === 'input').map(h => h.content);
                checkMissionSuccess(mission.title, actions).then(msg => setSuccessMsg(msg));
            }
        }
    }, [gameState, isReplaying]);

    return (
        <div className="flex flex-col h-screen w-screen bg-cyber-bg text-cyber-text overflow-hidden font-sans relative">
            {/* Editor Overlay */}
            {gameState.activeEditor && (
                <VimEditor
                    fileName={gameState.activeEditor.file}
                    initialContent={gameState.activeEditor.content}
                    onSave={handleVimSave}
                    onExit={handleVimExit}
                />
            )}

            {/* Header */}
            <div className="h-14 bg-cyber-bg border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-cyber-muted hover:text-white">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="font-bold text-sm tracking-wide uppercase text-white">{mission.title}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${missionComplete ? 'bg-cyber-primary' : 'bg-amber-500 animate-pulse'}`}></span>
                            <span className="text-xs text-cyber-muted font-mono">{missionComplete ? 'MISSION COMPLETE' : 'IN PROGRESS'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-cyber-danger hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20" title="Reset Mission">
                        <RotateCcw size={14} /> <span className="hidden md:inline">Reset</span>
                    </button>
                    {/* Replay button - always visible, disabled when no history or during replay */}
                    <button
                        onClick={handleReplay}
                        disabled={isReplaying || !missionComplete || gameState.commandHistory.length === 0}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors border border-transparent disabled:opacity-30 disabled:cursor-not-allowed ${missionComplete && gameState.commandHistory.length > 0
                            ? 'text-cyber-secondary hover:bg-blue-500/10 hover:border-blue-500/20'
                            : 'text-cyber-muted'
                            }`}
                        title={!missionComplete ? "Complete mission to enable replay" : gameState.commandHistory.length === 0 ? "No commands to replay" : "Replay mission"}
                    >
                        <Play size={14} /> <span className="hidden md:inline">Replay</span>
                    </button>
                    <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
                    <button onClick={() => setShowBriefing(true)} className="flex items-center gap-2 text-xs text-cyber-secondary hover:text-white transition-colors">
                        <BookOpen size={14} /> Theory
                    </button>
                    <div className="px-3 py-1 bg-cyber-card border border-white/10 rounded text-xs font-mono text-cyber-primary">
                        Task {Math.min(activeTaskIndex + 1, mission.tasks.length)} / {mission.tasks.length}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={`flex-1 flex overflow-hidden ${isReplaying ? 'opacity-95' : ''}`}>
                <MissionLayout
                    missionTitle={mission.title}
                    sidebarCollapsed={sidebarCollapsed}
                    setSidebarCollapsed={setSidebarCollapsed}
                    terminalCollapsed={terminalCollapsed}
                    setTerminalCollapsed={setTerminalCollapsed}
                    visualizationCollapsed={visualizationCollapsed}
                    setVisualizationCollapsed={setVisualizationCollapsed}
                    aiChatCollapsed={aiChatCollapsed}
                    setAiChatCollapsed={setAiChatCollapsed}
                    terminal={
                        <div className="flex flex-col h-full bg-[#0c0c0e]">
                            {/* Terminal Header with Replay Controls */}
                            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2 text-xs font-mono text-cyber-muted uppercase tracking-wider">
                                    <TerminalIcon size={14} />
                                    {isReplaying ? (
                                        <span className="text-cyber-accent animate-pulse">⏵ Replay Mode — Read Only</span>
                                    ) : (
                                        <span>Interactive Shell</span>
                                    )}
                                </div>

                                {/* Playback Controls - Only shown during replay */}
                                {isReplaying && (
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-1 bg-cyber-accent/10 rounded text-[10px] font-mono text-cyber-accent">
                                            Step {replayStep} / {replayTotal}
                                        </div>
                                        <button onClick={toggleReplayPause} className={`p-1.5 rounded transition-colors ${replayPaused ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`} title={replayPaused ? "Resume" : "Pause"}>
                                            {replayPaused ? <Play size={12} /> : <Pause size={12} />}
                                        </button>
                                        <button onClick={changeReplaySpeed} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold hover:bg-blue-500/30 transition-colors" title="Change Speed">
                                            {replaySpeed}x
                                        </button>
                                        <button onClick={skipReplayStep} className="p-1.5 bg-white/10 text-white/70 rounded hover:bg-white/20 transition-colors" title="Skip Step">
                                            <SkipForward size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Terminal
                                history={history}
                                onCommand={handleCommand}
                                cwd={gameState.cwd}
                                disabled={isReplaying}
                                commandHistory={gameState.commandHistory || []}
                                onClear={() => setHistory([])}
                            />
                        </div>
                    }
                    visualization={
                        mission.category === 'Core' ? (
                            <div className="h-full overflow-auto bg-cyber-bg">
                                <EnvVisualizer gameState={gameState} />
                            </div>
                        ) : mission.category === 'Terminal' ? (
                            null
                        ) : (
                            <div className="h-full overflow-hidden bg-cyber-bg">
                                <GitGraph gameState={gameState} />
                            </div>
                        )
                    }
                    fileSystem={
                        <div className="flex flex-col h-full bg-[#0c0c0e]/70">
                            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs font-mono text-cyber-muted uppercase tracking-wider shrink-0 bg-[#0c0c0e]">
                                <FolderTree size={14} />
                                File System {mission.category === 'Terminal' && missionComplete && "(Final Snapshot)"}
                            </div>
                            <div className="flex-1 overflow-auto">
                                <FileSystemTree gameState={gameState} />
                            </div>
                        </div>
                    }
                    objectives={
                        <div className="h-full p-6 overflow-y-auto bg-cyber-card/50">
                            <h2 className="text-sm font-bold text-cyber-primary mb-4 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle size={16} /> Objectives
                            </h2>
                            <div className="space-y-4">
                                {mission.tasks.map((task, idx) => (
                                    <div key={task.id} className={`relative pl-6 pb-4 border-l ${idx < mission.tasks.length - 1 ? 'border-white/10' : 'border-transparent'}`}>
                                        <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 ${idx < activeTaskIndex || missionComplete ? 'bg-cyber-primary border-cyber-primary' :
                                            idx === activeTaskIndex ? 'bg-transparent border-amber-500 animate-pulse' :
                                                'bg-cyber-bg border-cyber-muted'
                                            }`}></div>
                                        <p className={`text-sm ${idx < activeTaskIndex || missionComplete ? 'text-cyber-muted line-through' : idx === activeTaskIndex ? 'text-white font-medium' : 'text-cyber-muted'}`}>
                                            {task.description}
                                        </p>
                                        {idx === activeTaskIndex && !missionComplete && (
                                            <div className="mt-2 text-xs bg-amber-500/10 text-amber-500 p-2 rounded border border-amber-500/20">
                                                Hint: {task.hint}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    }
                    aiChat={
                        <div className="h-full flex flex-col bg-cyber-card/50 border-t border-white/5">
                            <TutorChat
                                gameState={gameState}
                                terminalHistory={history}
                                currentObjective={missionComplete ? "Mission Complete" : activeTask?.description || "Loading..."}
                                missionName={mission.title}
                                onRunCommand={handleRunSuggestedCommand}
                                aiAnalysis={aiAnalysis}
                                userProgress={userProgress}
                            />
                        </div>
                    }
                />
            </div>

            {/* Briefing Modal */}
            {showBriefing && mission.theory && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-cyber-bg border border-cyber-secondary p-8 rounded-2xl max-w-lg w-full relative shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                        <button onClick={() => setShowBriefing(false)} className="absolute top-4 right-4 text-cyber-muted hover:text-white">
                            <X size={20} />
                        </button>
                        <div className="mb-6 flex items-center gap-3 text-cyber-secondary">
                            <div className="p-2 bg-cyber-secondary/20 rounded-lg">
                                <BookOpen size={24} />
                            </div>
                            <h2 className="text-xl font-bold uppercase tracking-wider">Mission Briefing</h2>
                        </div>
                        <div className="prose prose-invert prose-sm">
                            <p className="text-lg leading-relaxed text-gray-300">
                                {mission.theory}
                            </p>
                        </div>
                        <button onClick={() => setShowBriefing(false)} className="w-full mt-8 py-3 bg-cyber-secondary hover:bg-blue-500 text-white font-bold rounded-xl transition-all">
                            ACKNOWLEDGED
                        </button>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {missionComplete && !isReviewMode && !isReplaying && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="bg-cyber-bg border border-cyber-primary p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,220,130,0.3)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-primary to-transparent"></div>
                        <div className="mx-auto w-20 h-20 bg-cyber-primary/20 rounded-full flex items-center justify-center mb-6 text-cyber-primary animate-bounce">
                            <Trophy size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Mission Complete!</h2>
                        <div className="text-cyber-primary font-mono text-xl mb-6">+{mission.xp} XP</div>
                        <p className="text-cyber-muted mb-8 text-sm leading-relaxed">{successMsg || "Great work keeping the timeline clean."}</p>

                        <div className="flex gap-3">
                            <button onClick={() => setIsReviewMode(true)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2">
                                <Eye size={18} />
                                REVIEW
                            </button>
                            <button onClick={onExit} className="flex-1 py-3 bg-cyber-primary hover:bg-emerald-400 text-black font-bold rounded-xl transition-all hover:scale-[1.02]">
                                CONTINUE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Mode Banner */}
            {isReviewMode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 fade-in">
                    <div className="px-6 py-3 bg-cyber-primary/20 backdrop-blur-md border border-cyber-primary/50 rounded-full shadow-[0_0_30px_rgba(0,220,130,0.2)] flex items-center gap-4">
                        <span className="text-cyber-primary font-bold tracking-wider text-sm flex items-center gap-2">
                            <CheckCircle size={16} /> MISSION COMPLETE
                        </span>
                        <div className="w-[1px] h-4 bg-cyber-primary/30"></div>
                        <button onClick={onExit} className="text-white hover:text-cyber-primary text-sm font-medium transition-colors">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
            {gameState.activeEditor && (
                <div className="absolute inset-0 z-50">
                    <VimEditor
                        initialContent={gameState.activeEditor.content}
                        fileName={gameState.activeEditor.file}
                        onSave={handleVimSave}
                        onExit={handleVimExit}
                    />
                </div>
            )}

            <ShortcutHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        </div>
    );
};

export default MissionView;