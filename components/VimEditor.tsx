import React, { useState, useRef, useEffect } from 'react';

interface VimEditorProps {
  initialContent: string;
  fileName: string;
  onSave: (content: string) => void;
  onExit: () => void;
}

const VimEditor: React.FC<VimEditorProps> = ({ initialContent, fileName, onSave, onExit }) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'NORMAL' | 'INSERT' | 'COMMAND'>('NORMAL');
  const [command, setCommand] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'INSERT' || mode === 'NORMAL') {
        textAreaRef.current?.focus();
    } else if (mode === 'COMMAND') {
        commandInputRef.current?.focus();
    }
  }, [mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (mode === 'NORMAL') {
          if (e.key === 'i') {
              e.preventDefault();
              setMode('INSERT');
          } else if (e.key === ':') {
              e.preventDefault();
              setMode('COMMAND');
              setCommand(':');
          }
      } else if (mode === 'INSERT') {
          if (e.key === 'Escape') {
              e.preventDefault();
              setMode('NORMAL');
          }
      } else if (mode === 'COMMAND') {
          if (e.key === 'Escape') {
              setMode('NORMAL');
              setCommand('');
          } else if (e.key === 'Enter') {
              executeCommand();
          }
      }
  };

  const executeCommand = () => {
      const cmd = command.substring(1); // remove :
      if (cmd === 'w') {
          onSave(content);
          setMode('NORMAL');
      } else if (cmd === 'wq') {
          onSave(content);
          onExit();
      } else if (cmd === 'q') {
          onExit();
      } else if (cmd === 'q!') {
          onExit();
      }
      setCommand('');
  };

  return (
    <div className="absolute inset-0 bg-[#0f0f0f] text-[#cccccc] font-mono flex flex-col z-50">
        <div className="flex-1 relative">
            <textarea
                ref={textAreaRef}
                value={content}
                onChange={e => mode === 'INSERT' && setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-transparent resize-none outline-none border-none p-4 font-mono text-sm leading-6"
                readOnly={mode !== 'INSERT'}
                spellCheck={false}
            />
            {/* Tildes */}
            <div className="absolute top-0 left-0 h-full w-4 pointer-events-none text-blue-900 flex flex-col pt-4 pl-1 select-none">
                {Array.from({ length: 20 }).map((_, i) => <div key={i}>~</div>)}
            </div>
        </div>
        
        {/* Status Bar */}
        <div className="h-6 bg-[#1f1f1f] flex items-center justify-between px-2 text-xs select-none">
            <div className="font-bold">
                {mode} {mode === 'NORMAL' ? '' : '--'}
            </div>
            <div>"{fileName}" {content.split('\n').length}L</div>
        </div>

        {/* Command Line */}
        {mode === 'COMMAND' && (
            <div className="h-6 bg-[#0f0f0f] flex items-center px-1">
                <input 
                    ref={commandInputRef}
                    type="text" 
                    value={command} 
                    onChange={e => setCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent outline-none border-none text-white font-mono text-sm"
                />
            </div>
        )}
    </div>
  );
};

export default VimEditor;
