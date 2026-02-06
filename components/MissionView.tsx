import React, { useState, useEffect, useRef } from 'react';
import Terminal from './Terminal';
import GitGraph from './GitGraph';
import TutorChat from './TutorChat';
import EnvVisualizer from './EnvVisualizer';
import VimEditor from './VimEditor';
import { executeCommand, INITIAL_STATE } from '../services/gitEngine';
import { GameState, TerminalLine, Mission, SavedMissionState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { checkMissionSuccess } from '../services/geminiService';
import { ArrowLeft, CheckCircle, FolderTree, Terminal as TerminalIcon, Trophy, BookOpen, X, RotateCcw, Save, Play, Eye } from 'lucide-react';

interface MissionViewProps {
    mission: Mission;
    onExit: () => void;
    onComplete: (xp: number) => void;
}

const MissionView: React.FC<MissionViewProps> = ({ mission, onExit, onComplete }) => {
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
    const handleCommand = (cmd: string) => {
        if (isReplaying || gameState.activeEditor) return; // Block terminal input if editor is open

        const inputLine: TerminalLine = { id: uuidv4(), type: 'input', content: cmd };
        
        // --- COMMAND ENGINE EXECUTION ---
        const { output, type, newState } = executeCommand(cmd, gameState);
        
        // Track command in generic history
        newState.commandHistory = [...(newState.commandHistory || []), cmd];

        const outputLine: TerminalLine = { id: uuidv4(), type, content: output };
        setHistory(prev => [...prev, inputLine, ...(output ? [outputLine] : [])]);
        setGameState(newState);
    };

    const handleVimSave = (content: string) => {
        if (!gameState.activeEditor) return;
        const fileName = gameState.activeEditor.file;
        const newState = { ...gameState };
        
        // Simple file update logic (assumes current directory for MVP)
        // In a real app, use the resolvePath logic from gitEngine
        const fileNode = newState.fileSystem['project']?.children?.[fileName];
        if (fileNode) {
            fileNode.content = content;
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
        
        if (!window.confirm("Watch a replay of your actions?")) return;

        setIsReplaying(true);
        setIsReviewMode(false);
        setMissionComplete(false);

        const actionsToReplay = [...gameState.commandHistory];
        
        // Reset State temporarily for replay
        let replayState = {
            ...INITIAL_STATE,
            fileSystem: JSON.parse(JSON.stringify(mission.initialFileSystem))
        };
        setGameState(replayState);
        setHistory(initialHistory);
        setActiveTaskIndex(0);

        for (const cmd of actionsToReplay) {
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const inputLine: TerminalLine = { id: uuidv4(), type: 'input', content: cmd };
            setHistory(prev => [...prev, inputLine]);

            const { output, type, newState } = executeCommand(cmd, replayState);
            const outputLine: TerminalLine = { id: uuidv4(), type, content: output };
            
            setHistory(prev => [...prev, ...(output ? [outputLine] : [])]);
            setGameState(newState);
            replayState = newState;
        }

        setIsReplaying(false);
        setMissionComplete(true);
        setIsReviewMode(true);
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
                     {missionComplete && (
                        <button onClick={handleReplay} disabled={isReplaying} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-cyber-secondary hover:bg-blue-500/10 transition-colors border border-transparent hover:border-blue-500/20 disabled:opacity-50">
                            <Play size={14} /> <span className="hidden md:inline">Replay</span>
                        </button>
                     )}
                     <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
                     <button onClick={() => setShowBriefing(true)} className="flex items-center gap-2 text-xs text-cyber-secondary hover:text-white transition-colors">
                        <BookOpen size={14}/> Theory
                     </button>
                     <div className="px-3 py-1 bg-cyber-card border border-white/10 rounded text-xs font-mono text-cyber-primary">
                        Task {Math.min(activeTaskIndex + 1, mission.tasks.length)} / {mission.tasks.length}
                     </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Column 1: Terminal */}
                <div className="flex-1 min-w-[350px] flex flex-col border-r border-white/5 bg-[#0c0c0e]">
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs font-mono text-cyber-muted uppercase tracking-wider">
                        <TerminalIcon size={14} />
                        Interactive Shell
                    </div>
                    <Terminal history={history} onCommand={handleCommand} cwd={gameState.cwd} />
                </div>

                {/* Column 2: Visualization (Graph or Env) */}
                <div className="flex-1 min-w-[350px] flex flex-col bg-cyber-bg relative border-r border-white/5">
                     {/* Conditional Header Label */}
                     <div className="absolute top-4 left-4 z-10 glass px-3 py-1 rounded-full text-xs font-mono text-cyber-secondary flex items-center gap-2 shadow-lg">
                        <FolderTree size={14}/>
                        <span>{mission.category === 'Core' ? 'System State' : 'Repository State'} {missionComplete && "(Final Snapshot)"}</span>
                     </div>
                     
                     <div className="flex-1 overflow-hidden relative">
                         {mission.category === 'Core' ? (
                             <EnvVisualizer gameState={gameState} />
                         ) : (
                             // FIX: Pass the full gameState object to GitGraph, not just gameState.git.
                             <GitGraph gameState={gameState} />
                         )}
                     </div>

                     <div className="h-48 border-t border-white/10 bg-[#0c0c0e]/50 backdrop-blur-sm p-4 font-mono text-xs overflow-auto">
                        <div className="text-cyber-muted mb-2 font-bold flex items-center gap-2">
                            <FolderTree size={12}/> FILE SYSTEM
                        </div>
                        <pre className="text-cyber-text/80">
                            {JSON.stringify(gameState.fileSystem, (key, value) => {
                                if (key === 'children') return value;
                                if (key === 'content') return undefined; 
                                return value;
                            }, 2)}
                        </pre>
                     </div>
                </div>

                {/* Column 3: Control */}
                <div className="w-[350px] shrink-0 flex flex-col bg-cyber-card border-l border-white/5 backdrop-blur-xl">
                    <div className="flex-1 p-6 overflow-y-auto border-b border-white/10">
                        <h2 className="text-sm font-bold text-cyber-primary mb-4 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle size={16}/> Objectives
                        </h2>
                        <div className="space-y-4">
                            {mission.tasks.map((task, idx) => (
                                <div key={task.id} className={`relative pl-6 pb-4 border-l ${idx < mission.tasks.length - 1 ? 'border-white/10' : 'border-transparent'}`}>
                                    <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 ${
                                        idx < activeTaskIndex || missionComplete ? 'bg-cyber-primary border-cyber-primary' : 
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
                    <div className="h-1/2 flex flex-col">
                        <TutorChat 
                            gameState={gameState} 
                            terminalHistory={history}
                            currentObjective={missionComplete ? "Mission Complete" : activeTask?.description || "Loading..."} 
                        />
                    </div>
                </div>
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
        </div>
    );
};

export default MissionView;