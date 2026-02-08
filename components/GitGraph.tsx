import React, { useState, useEffect } from 'react';
import { GitState, Commit, GameState } from '../types';
import { Folder, File, Layers, Cloud, GitCommit, HardDrive, ArrowRight } from 'lucide-react';

interface GitGraphProps {
    gameState: GameState;
}

const CommitNode = ({ commit, x, y, isHead, refs, color }: any) => {
    // Format timestamp for tooltip
    const date = new Date(commit.timestamp);
    const timeAgo = date.toLocaleString();

    return (
        <g className="group cursor-pointer transition-opacity">
            {/* Tooltip using SVG title - shows on hover */}
            <title>
                {`Commit: ${commit.id}
Message: ${commit.message}
Author: ${commit.author || 'Developer'}
Time: ${timeAgo}`}
            </title>

            {/* Halo for HEAD */}
            {isHead && (
                <circle cx={x} cy={y} r={22} fill="none" stroke="#00dc82" strokeWidth="1" strokeDasharray="4 2" className="animate-spin-slow opacity-70" />
            )}

            {/* Commit node - glows on hover */}
            <circle
                cx={x}
                cy={y}
                r={16}
                fill={isHead ? '#00dc82' : '#1e293b'}
                stroke={color}
                strokeWidth={2}
                className="transition-all duration-300 drop-shadow-md hover:drop-shadow-[0_0_8px_rgba(0,220,130,0.6)]"
            />

            {/* Commit Message & Hash */}
            <text x={x + 25} y={y + 5} fill="#e4e4e7" className="text-xs font-semibold" style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                {commit.message}
            </text>
            <text x={x + 25} y={y + 20} fill="#71717a" className="text-[10px] font-mono">
                {commit.id}
            </text>

            {/* Branch Labels */}
            {refs.map((ref: string, i: number) => (
                <g key={ref} transform={`translate(${x - 45}, ${y - 30 - (i * 20)})`}>
                    <title>{`Branch: ${ref}`}</title>
                    <rect x="0" y="0" width="auto" height="20" rx="4" fill={ref.includes('HEAD') ? "#00dc82" : color} className="min-w-[40px] px-2 shadow-lg" />
                    <text x="6" y="14" fill="#000" fontSize="10" fontWeight="bold" className="uppercase tracking-wider">{ref}</text>
                </g>
            ))}
        </g>
    );
};

const ConnectionLine = ({ x1, y1, x2, y2, color }: any) => (
    <path
        d={`M ${x1} ${y1} C ${x1} ${y1 + 35}, ${x2} ${y1 - 35}, ${x2} ${y2}`}
        stroke={color}
        strokeWidth="3"
        fill="none"
        className="opacity-50"
    />
);

const GraphArea = ({ commits, branches, HEAD, title, icon: Icon, isRemote = false, highlight }: any) => {
    const levelHeight = 70;
    const laneWidth = 60;
    const lanes: { [key: string]: number } = { 'main': 0 };
    let nextLane = 1;

    Object.keys(branches).forEach(b => {
        if (b !== 'main') lanes[b] = nextLane++;
    });

    const getLane = (commitId: string) => {
        const branchName = Object.keys(branches).find(b => branches[b] === commitId);
        return branchName ? lanes[branchName] || 0 : 0;
    };

    if (commits.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col text-cyber-muted opacity-30 border-r border-white/5 bg-[#0a0a0c]">
                <Icon size={48} className="mb-4" />
                <p className="font-mono text-xs tracking-widest uppercase">{title} EMPTY</p>
            </div>
        );
    }

    return (
        <div className={`flex-1 relative overflow-auto custom-scrollbar bg-[#0f1115] border-r border-white/5 transition-all duration-500 ${highlight ? 'shadow-[inset_0_0_20px_rgba(0,220,130,0.5)]' : ''}`}>
            <div className="absolute top-4 right-4 z-10 px-2 py-1 rounded bg-black/50 text-xs font-mono text-cyber-muted flex items-center gap-2 border border-white/10">
                <Icon size={12} /> {title}
            </div>
            <svg width="100%" height={Math.max(commits.length * levelHeight + 100, 400)} className="font-mono text-xs">
                {commits.map((commit: Commit, index: number) => {
                    const y = (commits.length - 1 - index) * levelHeight + 50;
                    const lane = getLane(commit.id);
                    const x = 60 + lane * laneWidth;

                    const color = lane === 0 ? '#3b82f6' : '#8b5cf6';

                    const parents = [];
                    if (commit.parentId) parents.push(commit.parentId);
                    if (commit.mergeParentId) parents.push(commit.mergeParentId);

                    return (
                        <React.Fragment key={commit.id}>
                            {parents.map(pid => {
                                const parentIndex = commits.findIndex((c: Commit) => c.id === pid);
                                if (parentIndex === -1) return null;
                                const parentY = (commits.length - 1 - parentIndex) * levelHeight + 50;
                                const parentLane = getLane(pid);
                                const parentX = 60 + parentLane * laneWidth;
                                return <ConnectionLine key={pid} x1={x} y1={y} x2={parentX} y2={parentY} color={color} />;
                            })}
                        </React.Fragment>
                    );
                })}

                {commits.map((commit: Commit, index: number) => {
                    const y = (commits.length - 1 - index) * levelHeight + 50;
                    const lane = getLane(commit.id);
                    const x = 60 + lane * laneWidth;
                    const color = lane === 0 ? '#3b82f6' : '#8b5cf6';

                    let isHead = false;
                    let refs: string[] = [];

                    if (!isRemote) {
                        if (HEAD.type === 'commit' && HEAD.ref === commit.id) isHead = true;
                        if (HEAD.type === 'branch' && branches[HEAD.ref] === commit.id) isHead = true;
                    }

                    Object.entries(branches).forEach(([name, id]) => {
                        if (id === commit.id) refs.push(name);
                    });

                    return <CommitNode key={commit.id} commit={commit} x={x} y={y} isHead={isHead} refs={refs} color={color} />;
                })}
            </svg>
        </div>
    );
};

const GitGraph: React.FC<GitGraphProps> = ({ gameState }) => {
    const { git: gitState, fileSystem } = gameState;
    const [highlightRemote, setHighlightRemote] = useState(false);

    useEffect(() => {
        // Detect a push by checking if remote commits increased
        const remote = Object.values(gitState.remotes)[0];
        if (remote && remote.commits.length > 0) {
            setHighlightRemote(true);
            const timer = setTimeout(() => setHighlightRemote(false), 1500); // Highlight for 1.5s
            return () => clearTimeout(timer);
        }
    }, [gitState.remotes]);


    if (!gitState.repoInitialized) {
        return (
            <div className="flex h-full items-center justify-center flex-col text-cyber-muted opacity-50 p-8 text-center bg-[#09090b]">
                <div className="w-16 h-16 border-2 border-dashed border-cyber-muted rounded-full mb-4 flex items-center justify-center animate-pulse">
                    <GitCommit size={24} />
                </div>
                <p className="font-mono text-sm tracking-widest uppercase mb-2">System Offline</p>
                <p className="text-xs">Initialize repository to activate visualization.</p>
            </div>
        );
    }

    const remoteName = Object.keys(gitState.remotes)[0];
    const remoteRepo = remoteName ? gitState.remotes[remoteName] : null;

    // Simple check for untracked files
    const untrackedFiles = Object.keys(fileSystem['project']?.children || {})
        .filter(file => !gitState.staging.includes(file) && gitState.commits.length === 0);

    return (
        <div className="h-full w-full flex flex-col bg-[#0f1115]">
            {/* Status Bar - Git Workflow Visualization */}
            <div className="shrink-0 min-h-[56px] border-b border-white/5 bg-[#0c0c0e]/90 backdrop-blur-md flex flex-wrap items-center px-4 py-2 gap-3 z-20">
                {/* Repository State Header Tab */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-secondary/20 border border-cyber-secondary/30 text-cyber-secondary text-xs font-mono shrink-0">
                    <Layers size={14} />
                    <span className="font-semibold tracking-wide">Repository State</span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-white/10 shrink-0" />

                {/* Git Workflow Status Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Working Directory Badge */}
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-help transition-all
                            ${untrackedFiles.length > 0
                                ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                                : 'bg-white/5 border border-white/10 text-cyber-muted'}`}
                        title="Working Directory: Your actual files on disk. Untracked files are new files Git doesn't know about yet."
                    >
                        <HardDrive size={12} />
                        <span>Working Dir</span>
                        {untrackedFiles.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-500/30 text-[10px] font-bold">
                                {untrackedFiles.length}
                            </span>
                        )}
                    </div>

                    {/* Arrow indicating flow direction */}
                    <ArrowRight
                        size={16}
                        className={`shrink-0 transition-colors ${gitState.staging.length > 0 ? 'text-cyber-primary animate-pulse' : 'text-white/20'}`}
                    />

                    {/* Staging Area Badge */}
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-help transition-all
                            ${gitState.staging.length > 0
                                ? 'bg-cyber-primary/20 border border-cyber-primary/40 text-cyber-primary'
                                : 'bg-white/5 border border-white/10 text-cyber-muted'}`}
                        title="Staging Area: Files staged and ready for commit. Use 'git commit' to save these changes."
                    >
                        <Layers size={12} />
                        <span>Staging</span>
                        {gitState.staging.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyber-primary/30 text-[10px] font-bold">
                                {gitState.staging.length}
                            </span>
                        )}
                    </div>

                    {/* Arrow to Commits */}
                    {gitState.commits.length > 0 && (
                        <>
                            <ArrowRight size={16} className="shrink-0 text-white/20" />

                            {/* Commits Badge */}
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-help bg-blue-500/20 border border-blue-500/40 text-blue-400"
                                title="Commit History: A permanent record of your project's changes over time."
                            >
                                <GitCommit size={12} />
                                <span>Commits</span>
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px] font-bold">
                                    {gitState.commits.length}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Remote Connection Status */}
                {remoteRepo && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-cyber-accent/20 border border-cyber-accent/40 text-cyber-accent animate-in fade-in shrink-0">
                        <Cloud size={12} />
                        <span>{remoteName}</span>
                    </div>
                )}
            </div>

            {/* Graphs Container */}
            <div className="flex-1 flex overflow-hidden">
                <GraphArea
                    commits={gitState.commits}
                    branches={gitState.branches}
                    HEAD={gitState.HEAD}
                    title="LOCAL REPO"
                    icon={HardDrive}
                />
                {remoteRepo && (
                    <GraphArea
                        commits={remoteRepo.commits}
                        branches={remoteRepo.branches}
                        HEAD={{ type: 'branch', ref: '' }}
                        title={`REMOTE (${remoteName})`}
                        icon={Cloud}
                        isRemote={true}
                        highlight={highlightRemote}
                    />
                )}
            </div>
        </div>
    );
};

export default GitGraph;
