import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine } from '../types';

interface TerminalProps {
  history: TerminalLine[];
  onCommand: (cmd: string) => void;
  cwd: string;
}

const Terminal: React.FC<TerminalProps> = ({ history, onCommand, cwd }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        onCommand(input);
        setInput('');
      }
    }
  };

  return (
    <div 
      className="h-full flex flex-col font-mono text-sm p-4 overflow-hidden"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {history.map((line) => (
          <div key={line.id} className="break-words leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
            {line.type === 'input' && (
                <div className="flex gap-2 text-white mt-2">
                    <span className="text-cyber-accent">➜</span>
                    <span className="text-cyber-secondary">~{cwd}</span>
                    <span className="opacity-80">{line.content}</span>
                </div>
            )}
            {line.type === 'output' && <div className="text-cyber-muted ml-4">{line.content}</div>}
            {line.type === 'error' && <div className="text-cyber-danger ml-4 bg-red-500/10 inline-block px-2 rounded">{line.content}</div>}
            {line.type === 'success' && <div className="text-cyber-primary ml-4">{line.content}</div>}
            {line.type === 'info' && <div className="text-blue-300 ml-4 italic opacity-80">{line.content}</div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-white relative group">
        <span className="text-cyber-accent font-bold">➜</span>
        <span className="text-cyber-secondary font-bold whitespace-nowrap">~{cwd}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none border-none text-white placeholder-white/20 caret-cyber-primary"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder="Type command..."
        />
        <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-cyber-primary/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
      </div>
    </div>
  );
};

export default Terminal;
