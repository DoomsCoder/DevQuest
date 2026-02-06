import React from 'react';
import { GameState } from '../types';
import { Shield, Lock, FileText, Database } from 'lucide-react';

interface EnvVisualizerProps {
  gameState: GameState;
}

const EnvVisualizer: React.FC<EnvVisualizerProps> = ({ gameState }) => {
  const { envVariables, fileSystem, cwd } = gameState;
  
  // Resolve .env file in current directory
  let envFileContent = '';
  const currentDir = cwd === '/' ? fileSystem : 
    cwd.split('/').filter(Boolean).reduce((acc: any, part) => acc?.children?.[part], fileSystem);
    
  if (currentDir?.children?.['.env']?.type === 'file') {
      envFileContent = currentDir.children['.env'].content || '';
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0f1115] p-6 space-y-6 overflow-auto custom-scrollbar">
        <div className="flex items-center gap-2 text-cyber-primary text-sm font-bold uppercase tracking-wider mb-2">
            <Shield size={18} /> Environment Security State
        </div>

        {/* Process Env Panel */}
        <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 relative overflow-hidden group hover:border-cyber-secondary/50 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={64} />
            </div>
            <h3 className="text-xs font-mono text-cyber-muted mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                ACTIVE PROCESS VARIABLES (export)
            </h3>
            <div className="space-y-2 font-mono text-sm">
                {Object.keys(envVariables).length === 0 ? (
                    <div className="text-white/20 italic">No active environment variables</div>
                ) : (
                    Object.entries(envVariables).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5">
                            <span className="text-cyber-secondary">{k}</span>
                            <span className="text-white font-bold">{v}</span>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* .env File Panel */}
        <div className="bg-[#18181b] border border-white/10 rounded-xl p-4 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText size={64} />
            </div>
            <h3 className="text-xs font-mono text-cyber-muted mb-3 flex items-center gap-2">
                <Lock size={12} />
                .env FILE CONTENT
            </h3>
            <div className="font-mono text-sm bg-black/30 p-3 rounded border border-white/5 min-h-[60px] whitespace-pre-wrap text-orange-200/80">
                {envFileContent || <span className="text-white/20 italic">File not found in current directory</span>}
            </div>
        </div>

        {/* Educational Note */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4 text-xs leading-relaxed text-blue-200/70">
            <strong className="text-blue-400 block mb-1">PRO TIP:</strong>
            <code>export</code> sets a variable for the current terminal session only. 
            Creating a <code>.env</code> file allows applications (like Node.js) to load secrets automatically when they start. 
            Remember to add <code>.env</code> to your <code>.gitignore</code>!
        </div>
    </div>
  );
};

export default EnvVisualizer;
