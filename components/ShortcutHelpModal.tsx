import React, { useEffect } from 'react';
import { X, Command, Keyboard, Layout, Terminal } from 'lucide-react';

interface ShortcutHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = {
    navigation: [
        { keys: ['↑', '↓'], desc: 'Navigate command history' },
        { keys: ['PageUp', 'PageDown'], desc: 'Scroll terminal output' },
        { keys: ['Ctrl', 'K'], desc: 'Focus terminal input' },
    ],
    execution: [
        { keys: ['Enter'], desc: 'Execute command' },
        { keys: ['Tab'], desc: 'Autocomplete command' },
        { keys: ['Ctrl', 'L'], desc: 'Clear terminal' },
        { keys: ['Ctrl', 'C'], desc: 'Cancel execution' },
    ],
    layout: [
        { keys: ['Ctrl', 'B'], desc: 'Toggle Sidebar' },
        { keys: ['Ctrl', 'G'], desc: 'Toggle Repo Graph' },
        { keys: ['Ctrl', '/'], desc: 'Toggle AI Assistant' },
    ],
    general: [
        { keys: ['?'], desc: 'Toggle this help' },
        { keys: ['Esc'], desc: 'Blur input / Close modal' },
    ]
};

const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({ isOpen, onClose }) => {
    // Close on Esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-cyber-bg border border-cyber-primary p-8 rounded-2xl max-w-4xl w-full relative shadow-[0_0_50px_rgba(0,220,130,0.2)]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-cyber-muted hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-8 text-cyber-primary">
                    <div className="p-3 bg-cyber-primary/20 rounded-lg">
                        <Keyboard size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold uppercase tracking-wider text-white">Keyboard Shortcuts</h2>
                        <p className="text-cyber-muted text-sm font-mono">Master the shell like a pro</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Navigation */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-cyber-secondary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                            <Terminal size={16} /> Navigation
                        </h3>
                        <div className="space-y-3">
                            {SHORTCUTS.navigation.map((s, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-cyber-muted text-sm group-hover:text-white transition-colors">{s.desc}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <span key={j} className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white min-w-[24px] text-center border border-white/5 shadow-sm">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Execution */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-cyber-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                            <Command size={16} /> Execution
                        </h3>
                        <div className="space-y-3">
                            {SHORTCUTS.execution.map((s, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-cyber-muted text-sm group-hover:text-white transition-colors">{s.desc}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <span key={j} className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white min-w-[24px] text-center border border-white/5 shadow-sm">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Layout */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-cyber-accent uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                            <Layout size={16} /> Layout
                        </h3>
                        <div className="space-y-3">
                            {SHORTCUTS.layout.map((s, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-cyber-muted text-sm group-hover:text-white transition-colors">{s.desc}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <span key={j} className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white min-w-[24px] text-center border border-white/5 shadow-sm">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* General */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                            <Keyboard size={16} /> General
                        </h3>
                        <div className="space-y-3">
                            {SHORTCUTS.general.map((s, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <span className="text-cyber-muted text-sm group-hover:text-white transition-colors">{s.desc}</span>
                                    <div className="flex gap-1">
                                        {s.keys.map((k, j) => (
                                            <span key={j} className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white min-w-[24px] text-center border border-white/5 shadow-sm">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-cyber-muted font-mono">
                    Press <span className="px-2 py-0.5 bg-white/10 rounded text-white mx-1">Esc</span> to close
                </div>
            </div>
        </div>
    );
};

export default ShortcutHelpModal;
