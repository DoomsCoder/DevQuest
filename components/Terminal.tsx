import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine } from '../types';
import GitStatusOutput from './GitStatusOutput';
import { ChevronRight } from 'lucide-react';

interface TerminalProps {
  history: TerminalLine[];
  onCommand: (cmd: string) => void;
  cwd: string;
  disabled?: boolean; // For replay mode
  commandHistory?: string[];
  onClear?: () => void;
}

const AVAILABLE_COMMANDS = ['git', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'clear', 'help', 'status', 'log', 'commit', 'add', 'push', 'pull', 'checkout', 'branch', 'merge', 'reset', 'revert'];

const Terminal: React.FC<TerminalProps> = ({ history, onCommand, cwd, disabled = false, commandHistory = [], onClear }) => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new history
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Global Shortcut: Ctrl+K to Focus
  useEffect(() => {
    const handleGlobalFocus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalFocus);
    return () => window.removeEventListener('keydown', handleGlobalFocus);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    // --- 1. COMMAND EXECUTION ---
    if (e.key === 'Enter') {
      if (activeSuggestion !== -1 && suggestions.length > 0) {
        // Complete with suggestion
        e.preventDefault();
        confirmSuggestion(suggestions[activeSuggestion]);
        return;
      }

      if (input.trim()) {
        onCommand(input);
        setInput('');
        setHistoryIndex(null);
        setSuggestions([]);
      } else if (e.shiftKey) {
        // Multi-line support (future)
      }
      return;
    }

    // --- 2. HISTORY NAVIGATION ---
    if (e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent cursor moving to start
      if (commandHistory.length === 0) return;

      const newIndex = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
      // Move cursor to end (React input cursor management is tricky, simpler to just set value)
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;

      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }

    // --- 3. AUTOCOMPLETE ---
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!input.trim()) return;

      const tokens = input.split(' ');
      const lastToken = tokens[tokens.length - 1];

      // If we already have suggestions, cycle through them? 
      // Or if strictly tab, maybe complete common prefix?
      // Simple implementation: Show suggestions if not showing, or cycle if showing.

      if (suggestions.length > 0) {
        // Cycle
        setActiveSuggestion(prev => (prev + 1) % suggestions.length);
      } else {
        // Generate suggestions
        const matches = AVAILABLE_COMMANDS.filter(cmd => cmd.startsWith(lastToken));
        if (matches.length === 1) {
          // Complete immediately
          confirmSuggestion(matches[0]);
        } else if (matches.length > 1) {
          setSuggestions(matches);
          setActiveSuggestion(0);
        }
      }
    }

    if (e.key === 'Escape') {
      if (suggestions.length > 0) {
        setSuggestions([]);
      } else {
        inputRef.current?.blur();
      }
    }

    // --- 4. TERMINAL CONTROL ---
    // Ctrl+L: Clear
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onClear?.();
    }

    // Ctrl+C: Cancel
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setInput('');
      setSuggestions([]);
      setHistoryIndex(null);
      // Ideally render ^C in output
    }

    // --- 5. SCROLLING ---
    // PageUp/Down
    if (e.key === 'PageUp') {
      e.preventDefault();
      scrollContainerRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      scrollContainerRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
    }
  };

  const confirmSuggestion = (suggestion: string) => {
    const tokens = input.split(' ');
    tokens[tokens.length - 1] = suggestion;
    setInput(tokens.join(' ') + ' ');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setSuggestions([]); // Clear suggestions on type
  };

  return (
    <div
      className={`h-full flex flex-col font-mono text-sm p-4 overflow-hidden ${disabled ? 'pointer-events-none' : ''}`}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-1 custom-scrollbar scroll-smooth"
      >
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

            {/* Git Status Output */}
            {(line.type === 'git-status' || line.type === 'git-branch') && line.structured && (
              <div className="ml-4 mt-1">
                <GitStatusOutput lines={line.structured.lines} />
              </div>
            )}
            {(line.type === 'git-status' || line.type === 'git-branch') && !line.structured && (
              <div className="text-blue-300 ml-4 whitespace-pre font-mono">{line.content}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!disabled ? (
        <div className="mt-4 flex items-center gap-2 text-white relative group">
          <span className="text-cyber-accent font-bold">➜</span>
          <span className="text-cyber-secondary font-bold whitespace-nowrap">~{cwd}</span>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent outline-none border-none text-white placeholder-white/20 caret-cyber-primary"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder="Type command..."
            />
            {/* Autocomplete Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 bg-cyber-card border border-cyber-primary/30 rounded-lg shadow-lg overflow-hidden z-50 min-w-[200px] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] text-cyber-muted uppercase tracking-wider border-b border-white/5 bg-black/40">Suggestions</div>
                {suggestions.map((s, idx) => (
                  <div
                    key={s}
                    className={`px-3 py-1.5 cursor-pointer hover:bg-cyber-primary/20 flex items-center gap-2 ${idx === activeSuggestion ? 'bg-cyber-primary/20 text-white' : 'text-cyber-muted'}`}
                    onClick={() => confirmSuggestion(s)}
                  >
                    <span className="w-1 h-1 rounded-full bg-cyber-primary"></span>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 left-0 w-full h-[1px] bg-gradient-to-r from-cyber-primary/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-cyber-muted">
          <span className="text-cyber-accent/50">➜</span>
          <span className="text-cyber-accent/50 text-xs italic">Watching replay...</span>
        </div>
      )}
    </div>
  );
};

export default Terminal;

