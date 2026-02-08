
import React from 'react';

export const LevelUpCelebration = ({ level, onClose }: { level: number; onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
        <div className="text-center">
            {/* Particle explosion effect */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-cyber-primary rounded-full animate-ping"
                            style={{
                                transform: `rotate(${i * 30}deg) translateY(-80px)`,
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: '1s'
                            }}
                        />
                    ))}
                </div>
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyber-primary to-emerald-500 rounded-full flex items-center justify-center text-6xl font-bold text-black shadow-[0_0_60px_rgba(0,220,130,0.6)] animate-bounce">
                    {level}
                </div>
            </div>

            <h2 className="text-4xl font-bold text-white mt-8 mb-2 animate-pulse">
                LEVEL UP!
            </h2>
            <p className="text-cyber-primary text-xl mb-8">
                You've reached Level {level}
            </p>

            <button
                onClick={onClose}
                className="px-8 py-3 bg-cyber-primary hover:bg-emerald-400 text-black font-bold rounded-lg transition-all hover:shadow-[0_0_30px_rgba(0,220,130,0.5)]"
            >
                Continue
            </button>
        </div>
    </div>
);
