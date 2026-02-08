
import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical, ChevronLeft, ChevronRight, Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';

interface MissionLayoutProps {
    terminal: ReactNode;
    visualization: ReactNode; // GitGraph or EnvVisualizer
    fileSystem: ReactNode;
    objectives: ReactNode;
    aiChat: ReactNode;
    missionTitle: string;
    // Layout State
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    terminalCollapsed: boolean;
    setTerminalCollapsed: (collapsed: boolean) => void;
    visualizationCollapsed: boolean;
    setVisualizationCollapsed: (collapsed: boolean) => void;
    aiChatCollapsed: boolean;
    setAiChatCollapsed: (collapsed: boolean) => void;
}

const MissionLayout: React.FC<MissionLayoutProps> = ({
    terminal,
    visualization,
    fileSystem,
    objectives,
    aiChat,
    missionTitle,
    sidebarCollapsed, setSidebarCollapsed,
    terminalCollapsed, setTerminalCollapsed,
    visualizationCollapsed, setVisualizationCollapsed,
    aiChatCollapsed, setAiChatCollapsed
}) => {
    // Refs for imperative panel control
    const terminalPanelRef = useRef<any>(null);
    const sidebarPanelRef = useRef<any>(null);
    const visualizationPanelRef = useRef<any>(null);
    const aiChatPanelRef = useRef<any>(null);

    // Sync props with panel state
    useEffect(() => {
        const panel = terminalPanelRef.current;
        if (panel) {
            terminalCollapsed ? panel.collapse() : panel.resize(30);
        }
    }, [terminalCollapsed]);

    useEffect(() => {
        const panel = sidebarPanelRef.current;
        if (panel) {
            // Check if we are mounted/ready
            sidebarCollapsed ? panel.collapse() : panel.resize(25);
        }
    }, [sidebarCollapsed]);

    useEffect(() => {
        const panel = visualizationPanelRef.current;
        if (panel) {
            visualizationCollapsed ? panel.collapse() : panel.resize(60);
        }
    }, [visualizationCollapsed]);

    useEffect(() => {
        const panel = aiChatPanelRef.current;
        if (panel) {
            aiChatCollapsed ? panel.collapse() : panel.resize(50);
        }
    }, [aiChatCollapsed]);

    // Focus modes
    const [focusedPanel, setFocusedPanel] = useState<'none' | 'terminal' | 'workspace' | 'sidebar'>('none');

    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    // Custom Handle Component for Cyberpunk Look
    const ResizeHandle = ({ vertical = false, className = '' }: { vertical?: boolean, className?: string }) => (
        <PanelResizeHandle className={`relative flex items-center justify-center bg-black transition-colors hover:bg-cyber-primary/20 group outline-none ${vertical ? 'h-2 w-full cursor-row-resize' : 'w-2 h-full cursor-col-resize'} ${className}`}>
            <div className={`bg-white/10 rounded-full transition-colors group-hover:bg-cyber-primary/50 ${vertical ? 'h-1 w-8' : 'w-1 h-8'}`} />
        </PanelResizeHandle>
    );

    if (focusedPanel === 'terminal') {
        return (
            <div className="h-full w-full relative">
                <button onClick={() => setFocusedPanel('none')} className="absolute top-4 right-4 z-50 p-2 bg-cyber-primary text-black rounded hover:opacity-80"><Minimize2 size={20} /></button>
                {terminal}
            </div>
        );
    }

    if (focusedPanel === 'workspace') {
        return (
            <div className="h-full w-full relative">
                <button onClick={() => setFocusedPanel('none')} className="absolute top-4 right-4 z-50 p-2 bg-cyber-primary text-black rounded hover:opacity-80"><Minimize2 size={20} /></button>
                <div className="h-full flex flex-col">
                    <div className="flex-1">{visualization}</div>
                    <div className="flex-1 border-t border-white/10">{fileSystem}</div>
                </div>
            </div>
        );
    }

    if (focusedPanel === 'sidebar') {
        return (
            <div className="h-full w-full relative">
                <button onClick={() => setFocusedPanel('none')} className="absolute top-4 right-4 z-50 p-2 bg-cyber-primary text-black rounded hover:opacity-80"><Minimize2 size={20} /></button>
                <div className="h-full flex flex-col">
                    <div className="flex-1 border-b border-white/5">{objectives}</div>
                    <div className="flex-1">{aiChat}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-cyber-bg overflow-hidden flex flex-col">
            {/* Header is assumed to be outside or we can slot it? For now assume MissionView handles header above this layout */}

            <PanelGroup direction="horizontal" autoSaveId={`layout-${missionTitle}`}>

                {/* 1. Terminal Panel */}
                <Panel
                    ref={terminalPanelRef}
                    defaultSize={30}
                    minSize={20}
                    collapsible={true}
                    onCollapse={() => setTerminalCollapsed(true)}
                    onExpand={() => setTerminalCollapsed(false)}
                >
                    <div className="h-full flex flex-col border-r border-white/5 relative group/panel">
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/panel:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => setFocusedPanel('terminal')} className="p-1 bg-black/50 text-cyber-muted hover:text-white rounded"><Maximize2 size={12} /></button>
                        </div>
                        {terminal}
                    </div>
                </Panel>

                <ResizeHandle />

                {/* 2. Workspace (Middle) */}
                <Panel minSize={30}>
                    <PanelGroup direction="vertical">
                        {/* Visualization (Top) */}
                        <Panel
                            ref={visualizationPanelRef}
                            defaultSize={60}
                            minSize={20}
                            collapsible={true}
                            onCollapse={() => setVisualizationCollapsed(true)}
                            onExpand={() => setVisualizationCollapsed(false)}
                        >
                            <div className="h-full border-r border-white/5 relative group/panel">
                                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/panel:opacity-100 transition-opacity flex gap-1">
                                    <button onClick={() => setFocusedPanel('workspace')} className="p-1 bg-black/50 text-cyber-muted hover:text-white rounded"><Maximize2 size={12} /></button>
                                </div>
                                {visualization}
                            </div>
                        </Panel>

                        <ResizeHandle vertical />

                        {/* File System (Bottom) */}
                        <Panel minSize={20}>
                            <div className="h-full border-r border-white/5 bg-[#0c0c0e]/50">
                                {fileSystem}
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>

                <ResizeHandle />

                {/* 3. Sidebar (Right) */}
                {sidebarCollapsed ? (
                    <div className="w-8 border-l border-white/5 flex flex-col items-center py-4 gap-4 bg-cyber-card">
                        <button onClick={toggleSidebar} className="p-1 hover:bg-white/10 rounded text-cyber-muted"><ChevronLeft size={16} /></button>
                        <div className="writing-vertical-rl text-xs text-cyber-muted font-mono tracking-widest uppercase rotate-180">Objectives</div>
                        <div className="writing-vertical-rl text-xs text-cyber-muted font-mono tracking-widest uppercase rotate-180 mt-4">AI Chat</div>
                    </div>
                ) : (
                    <Panel
                        ref={sidebarPanelRef}
                        defaultSize={25}
                        minSize={15}
                        maxSize={40}
                        collapsible={true}
                        onCollapse={() => setSidebarCollapsed(true)}
                        onExpand={() => setSidebarCollapsed(false)}
                    >
                        <div className="h-full border-l border-white/5 bg-cyber-card relative group/panel">
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/panel:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => setFocusedPanel('sidebar')} className="p-1 bg-black/50 text-cyber-muted hover:text-white rounded"><Maximize2 size={12} /></button>
                                <button onClick={toggleSidebar} className="p-1 bg-black/50 text-cyber-muted hover:text-white rounded"><ChevronRight size={12} /></button>
                            </div>
                            <PanelGroup direction="vertical">
                                <Panel defaultSize={50} minSize={20}>
                                    <div className="h-full relative overflow-hidden">
                                        {objectives}
                                    </div>
                                </Panel>
                                <ResizeHandle vertical className="bg-cyber-card" />
                                <Panel minSize={20} collapsible={true} ref={aiChatPanelRef} onCollapse={() => setAiChatCollapsed(true)} onExpand={() => setAiChatCollapsed(false)}>
                                    <div className="h-full relative overflow-hidden">
                                        {aiChat}
                                    </div>
                                </Panel>
                            </PanelGroup>
                        </div>
                    </Panel>
                )}

            </PanelGroup>
        </div>
    );
};

export default MissionLayout;
