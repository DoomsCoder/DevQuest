
import React from 'react';
import { Terminal, GitBranch, Sparkles, X } from 'lucide-react';

export const OnboardingModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-cyber-bg border border-cyber-primary/30 rounded-2xl max-w-2xl w-full mx-4 relative overflow-hidden shadow-[0_0_60px_rgba(0,220,130,0.2)]">
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-cyber-primary/20 blur-[100px] rounded-full pointer-events-none"></div>

            {/* Close button */}
            <button onClick={onClose} className="absolute top-4 right-4 text-cyber-muted hover:text-white transition-colors z-10">
                <X size={24} />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Welcome to <span className="text-cyber-primary">DevQuest</span>
                    </h2>
                    <p className="text-cyber-muted">Master developer skills through interactive missions</p>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                            <Terminal size={20} className="text-blue-400" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Interactive Terminal</h3>
                        <p className="text-xs text-cyber-muted">Type real Git & Bash commands in a safe simulation</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                            <GitBranch size={20} className="text-orange-400" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Live Git Graph</h3>
                        <p className="text-xs text-cyber-muted">Watch commits, branches & merges visualized in real-time</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                            <Sparkles size={20} className="text-purple-400" />
                        </div>
                        <h3 className="font-bold text-white mb-1">AI Tutor</h3>
                        <p className="text-xs text-cyber-muted">Get hints & explanations from Gemini AI when stuck</p>
                    </div>
                </div>

                {/* Tips */}
                <div className="bg-cyber-primary/10 border border-cyber-primary/20 rounded-xl p-4 mb-6">
                    <h4 className="text-cyber-primary font-bold text-sm mb-2">💡 Pro Tips</h4>
                    <ul className="text-xs text-cyber-muted space-y-1">
                        <li>• Complete tasks in order — each builds on the previous</li>
                        <li>• Read the "Theory" before starting for context</li>
                        <li>• Ask the AI Tutor if you get stuck!</li>
                    </ul>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-cyber-primary hover:bg-emerald-400 text-black font-bold rounded-xl transition-all hover:shadow-[0_0_30px_rgba(0,220,130,0.4)] hover:-translate-y-0.5"
                >
                    START YOUR JOURNEY
                </button>
            </div>
        </div>
    </div>
);
