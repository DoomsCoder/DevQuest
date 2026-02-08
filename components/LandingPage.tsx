
import React from 'react';
import { ChevronRight } from 'lucide-react';

export const LandingPage = ({ onStart }: { onStart: () => void }) => (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyber-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none"></div>

        <div className="relative z-10 text-center max-w-4xl px-4">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                Dev<span className="text-cyber-primary">Quest</span>
            </h1>
            <p className="text-xl md:text-2xl text-cyber-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                Master the Terminal, Git, and Core Dev Skills through interactive simulation.
            </p>
            <button
                onClick={onStart}
                className="group relative px-8 py-4 bg-cyber-primary hover:bg-emerald-400 text-black font-bold rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,220,130,0.4)] hover:-translate-y-1"
            >
                <div className="flex items-center gap-2">
                    INITIALIZE TRAINING
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
        </div>
    </div>
);
