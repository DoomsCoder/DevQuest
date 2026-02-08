import React, { useState } from 'react';
import { TerminalOutputLine } from '../types';
import { Info } from 'lucide-react';

interface GitStatusOutputProps {
    lines: TerminalOutputLine[];
}

/**
 * GitStatusOutput Component
 * 
 * Renders structured git command output with:
 * - Color coding (green for staged, red for modified, etc.)
 * - Educational tooltips on hover
 * - Proper monospace formatting and indentation
 */
const GitStatusOutput: React.FC<GitStatusOutputProps> = ({ lines }) => {
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);

    const getLineColor = (type: TerminalOutputLine['type']): string => {
        switch (type) {
            case 'header':
                return 'text-white font-semibold';
            case 'hint':
                return 'text-gray-500 italic';
            case 'staged':
                return 'text-green-400';
            case 'modified':
                return 'text-red-400';
            case 'deleted':
                return 'text-red-500';
            case 'untracked':
                return 'text-red-400';
            case 'branch':
                return 'text-white';
            case 'branch-current':
                return 'text-green-400 font-bold';
            case 'normal':
            default:
                return 'text-white/80';
        }
    };

    return (
        <div className="font-mono text-sm whitespace-pre leading-relaxed">
            {lines.map((line, index) => (
                <div
                    key={index}
                    className={`relative group ${getLineColor(line.type)}`}
                    onMouseEnter={() => setHoveredLine(index)}
                    onMouseLeave={() => setHoveredLine(null)}
                >
                    {/* Line content */}
                    <span className="inline-block">{line.text || '\u00A0'}</span>

                    {/* Tooltip indicator */}
                    {line.tooltip && (
                        <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center">
                            <Info size={12} className="text-cyber-secondary" />
                        </span>
                    )}

                    {/* Tooltip popup */}
                    {line.tooltip && hoveredLine === index && (
                        <div className="absolute left-0 top-full mt-1 z-50 max-w-md p-3 bg-cyber-card border border-cyber-secondary/30 rounded-lg shadow-lg shadow-cyber-secondary/10 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-start gap-2">
                                <Info size={14} className="text-cyber-secondary shrink-0 mt-0.5" />
                                <p className="text-xs text-cyber-text/90 leading-relaxed">
                                    {line.tooltip}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default GitStatusOutput;
