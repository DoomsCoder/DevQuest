import React, { useState, useEffect, useRef } from 'react';
import { getTutorResponse } from '../services/geminiService';
import { GameState, TerminalLine } from '../types';
import { MessageSquare, Cpu, Send, Sparkles } from 'lucide-react';

interface TutorChatProps {
    gameState: GameState;
    terminalHistory: TerminalLine[];
    currentObjective: string;
}

const TutorChat: React.FC<TutorChatProps> = ({ gameState, terminalHistory, currentObjective }) => {
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: "Systems online. I'm connected to your terminal. Ask me for hints or status reports!" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        const response = await getTutorResponse(userMsg, gameState, terminalHistory, currentObjective);
        
        setMessages(prev => [...prev, { role: 'model', text: response }]);
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-cyber-card/30 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyber-secondary font-bold text-sm tracking-wider uppercase">
                    <Sparkles size={16} />
                    <span>AI Assistant</span>
                </div>
                <div className="w-2 h-2 bg-cyber-primary rounded-full animate-pulse shadow-glow-green"></div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-cyber-secondary/20 text-blue-100 border border-cyber-secondary/30 rounded-br-none' 
                            : 'bg-white/5 text-gray-300 border border-white/10 rounded-bl-none shadow-lg'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
                             <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyber-muted rounded-full animate-bounce"></div>
                            </div>
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
                        placeholder="Request support..."
                        className="w-full bg-white/5 text-white text-xs rounded-lg pl-3 pr-10 py-3 outline-none border border-transparent focus:border-cyber-primary/50 transition-colors placeholder-white/20"
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
