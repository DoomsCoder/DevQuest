
import React, { useState, useEffect, useRef } from 'react';
import { getTutorResponse, isAIAvailable, AIResponse } from '../services/geminiService';
import { GameState, TerminalLine, UserProgress } from '../types';
import { Sparkles, Send, WifiOff, Play, Zap } from 'lucide-react';

interface TutorChatProps {
    gameState: GameState;
    terminalHistory: TerminalLine[];
    currentObjective: string;
    missionName: string;
    onRunCommand?: (command: string) => void;
    aiAnalysis?: AIResponse | null;
    userProgress?: UserProgress | null;
}

interface ChatMessage {
    role: 'user' | 'model' | 'system';
    text: string;
    suggestedCommand?: string;
    timestamp: number;
}

// Format message content with code highlighting
const formatMessage = (text: string) => {
    // Split by backticks and format code segments
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            const code = part.slice(1, -1);
            return (
                <code
                    key={i}
                    className="bg-cyber-primary/20 text-cyber-primary px-1.5 py-0.5 rounded font-mono text-[11px]"
                >
                    {code}
                </code>
            );
        }
        return <span key={i}>{part}</span>;
    });
};

const TutorChat: React.FC<TutorChatProps> = ({
    gameState,
    terminalHistory,
    currentObjective,
    missionName,
    onRunCommand,
    aiAnalysis,
    userProgress
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'system',
            text: "Systems online. I'm connected to your terminal. Ask me for hints or run commands to get real-time guidance!",
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const lastAnalysisRef = useRef<string>('');

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle incoming AI analysis (auto-triggered on errors)
    useEffect(() => {
        if (aiAnalysis && aiAnalysis.shouldAutoDisplay && aiAnalysis.message) {
            // Prevent duplicate messages
            const analysisKey = aiAnalysis.message.substring(0, 50);
            if (analysisKey !== lastAnalysisRef.current) {
                lastAnalysisRef.current = analysisKey;
                setMessages(prev => [...prev, {
                    role: 'model',
                    text: aiAnalysis.message,
                    suggestedCommand: aiAnalysis.suggestedCommand,
                    timestamp: Date.now()
                }]);
            }
        }
    }, [aiAnalysis]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
        setLoading(true);

        const response = await getTutorResponse(userMsg, gameState, terminalHistory, currentObjective, userProgress);

        setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
        setLoading(false);
    };

    const handleRunCommand = (command: string) => {
        if (onRunCommand) {
            onRunCommand(command);
        }
    };

    return (
        <div className="flex flex-col h-full bg-cyber-card/30 backdrop-blur-sm">
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2 text-cyber-secondary font-bold text-xs tracking-wider uppercase">
                    <Sparkles size={14} className="text-cyber-accent" />
                    <span>AI Assistant</span>
                </div>
                {isAIAvailable() ? (
                    <div className="flex items-center gap-1.5" title="AI Online - Gemini Connected">
                        <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse shadow-glow-green"></div>
                        <span className="text-[10px] text-cyber-primary font-mono">ONLINE</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5" title="Add VITE_GEMINI_API_KEY to .env.local">
                        <WifiOff size={12} className="text-orange-400" />
                        <span className="text-[10px] text-orange-400 font-mono">OFFLINE</span>
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[95%] rounded-xl text-xs leading-relaxed ${msg.role === 'user'
                            ? 'bg-cyber-secondary/20 text-blue-100 border border-cyber-secondary/30 rounded-br-none p-3'
                            : msg.role === 'system'
                                ? 'bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 rounded-bl-none p-3 italic'
                                : 'bg-white/5 text-gray-200 border border-white/10 rounded-bl-none shadow-lg p-3'
                            }`}>
                            <div className="whitespace-pre-wrap">{formatMessage(msg.text)}</div>

                            {/* Run Command Button */}
                            {msg.suggestedCommand && onRunCommand && (
                                <button
                                    onClick={() => handleRunCommand(msg.suggestedCommand!)}
                                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-cyber-primary/20 hover:bg-cyber-primary/30 border border-cyber-primary/40 rounded-lg text-cyber-primary text-[11px] font-medium transition-all hover:scale-105"
                                >
                                    <Play size={12} className="fill-current" />
                                    Run: {msg.suggestedCommand}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 p-3 rounded-xl rounded-bl-none flex items-center gap-2 border border-white/10">
                            <Zap size={12} className="text-cyber-accent animate-pulse" />
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce"></div>
                            </div>
                            <span className="text-[10px] text-cyber-muted">Analyzing...</span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-black/20">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask me for hints or status reports..."
                        className="w-full bg-white/5 text-white text-xs rounded-lg pl-3 pr-10 py-3 outline-none border border-transparent focus:border-cyber-primary/50 transition-colors placeholder-white/30"
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading}
                        className="absolute right-2 text-cyber-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorChat;
