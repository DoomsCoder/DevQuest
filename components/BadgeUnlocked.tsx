
import React from 'react';
import { Badge } from '../data/missions';

export const BadgeUnlocked = ({ badge, onClose }: { badge: Badge; onClose: () => void }) => (
    <div
        className="fixed bottom-6 right-6 z-[150] animate-in slide-in-from-right duration-500"
        onClick={onClose}
    >
        <div className={`bg-gradient-to-r ${badge.color} p-1 rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-transform`}>
            <div className="bg-cyber-bg rounded-lg p-4 flex items-center gap-4">
                <div className="text-4xl">{badge.icon}</div>
                <div>
                    <div className="text-xs text-cyber-muted uppercase tracking-wider">Badge Unlocked!</div>
                    <div className="text-white font-bold">{badge.name}</div>
                    <div className="text-xs text-cyber-muted">{badge.description}</div>
                </div>
            </div>
        </div>
    </div>
);
