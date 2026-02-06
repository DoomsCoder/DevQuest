import React, { useState, useEffect } from 'react';
import { GitState, Commit, GameState } from '../types';
import { Folder, File, Layers, Cloud, GitCommit, HardDrive, ArrowRight } from 'lucide-react';

interface GitGraphProps {
  gameState: GameState;
}

const CommitNode = ({ commit, x, y, isHead, refs, color }: any) => (
    <g className="group cursor-pointer hover:opacity-100 transition-opacity">
        {/* Halo for HEAD */}
        {isHead && (
            <circle cx={x} cy={y} r={22} fill="none" stroke="#00dc82" strokeWidth="1" strokeDasharray="4 2" className="animate-spin-slow opacity-70" />
        )}

        <circle 
            cx={x} 
            cy={y} 
            r={16} 
            fill={isHead ? '#00dc82' : '#1e293b'} 
            stroke={color}
            strokeWidth={2}
            className="transition-all duration-300 drop-shadow-md"
        />
        
        {/* Commit Message & Hash */}
        <text x={x + 25} y={y + 5} fill="#e4e4e7" className="text-xs font-semibold" style={{ textShadow: '0 0 10px rgba(0,0,0,0.5)'}}>
            {commit.message}
        </text>
        <text x={x + 25} y={y + 20} fill="#71717a" className="text-[10px] font-mono">
            {commit.id}
        </text>

        {/* Branch Labels */}
        {refs.map((ref: string, i: number) => (
            <g key={ref} transform={`translate(${x - 45}, ${y - 30 - (i * 20)})`}>
                <rect x="0" y="0" width="auto" height="20" rx="4" fill={ref.includes('HEAD') ? "#00dc82" : color} className="min-w-[40px] px-2 shadow-lg" />
                <text x="6" y="14" fill="#000" fontSize="10" fontWeight="bold" className="uppercase tracking-wider">{ref}</text>
            </g>
        ))}
    </g>
);

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
                <Icon size={12}/> {title}
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
        {/* Status Bar */}
        <div className="shrink-0 h-12 border-b border-white/5 bg-[#0c0c0e]/80 backdrop-blur flex items-center px-4 justify-between">
            <div className="flex items-center gap-4">
                 <div className={`flex items-center gap-2 text-xs transition-colors ${untrackedFiles.length > 0 ? 'text-yellow-400' : 'text-cyber-muted'}`}>
                    <HardDrive size={14} />
                    <span>Working Dir {untrackedFiles.length > 0 ? `(${untrackedFiles.length})` : ''}</span>
                 </div>
                 <ArrowRight size={12} className="text-white/20" />
                 <div className={`flex items-center gap-2 text-xs transition-colors ${gitState.staging.length > 0 ? 'text-cyber-primary font-bold' : 'text-cyber-muted'}`}>
                    <Layers size={14} />
                    <span>Staging ({gitState.staging.length})</span>
                 </div>
            </div>
            {remoteRepo && (
                 <div className="flex items-center gap-2 text-xs text-cyber-accent animate-in fade-in">
                    <Cloud size={14} />
                    <span>Connected: {remoteName}</span>
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
