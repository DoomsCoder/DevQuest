
import React from 'react';

export const XPGainAnimation = ({ xp }: { xp: number }) => (
    <div className="fixed top-20 right-10 z-[100] animate-in slide-in-from-bottom fade-in duration-700 pointer-events-none">
        <div className="flex flex-col items-center">
            <div className="text-4xl font-bold text-cyber-primary drop-shadow-[0_0_10px_rgba(0,220,130,0.8)] animate-bounce">
                +{xp} XP
            </div>
        </div>
    </div>
);
