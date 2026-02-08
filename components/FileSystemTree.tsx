import React, { useState } from 'react';
import { GameState, FileNode } from '../types';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Terminal, MapPin } from 'lucide-react';

interface FileSystemTreeProps {
    gameState: GameState;
}

interface TreeNodeProps {
    name: string;
    node: FileNode;
    path: string;
    currentPath: string;
    depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ name, node, path, currentPath, depth }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isDirectory = node.type === 'directory';
    const isCurrentDir = path === currentPath || (path === '' && currentPath === `/${name}`);
    const fullPath = path ? `${path}/${name}` : `/${name}`;

    // Check if this directory contains the current working directory
    const containsCwd = currentPath.startsWith(fullPath);

    return (
        <div className="select-none">
            <div
                className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-all duration-200 group
                    ${isCurrentDir ? 'bg-cyber-primary/20 text-cyber-primary' : 'hover:bg-white/5 text-cyber-text/80'}
                    ${containsCwd && !isCurrentDir ? 'text-cyber-secondary' : ''}
                `}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => isDirectory && setIsExpanded(!isExpanded)}
            >
                {/* Expand/Collapse Icon */}
                {isDirectory && (
                    <span className="text-cyber-muted w-4">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                )}

                {/* File/Folder Icon */}
                {isDirectory ? (
                    isExpanded ? (
                        <FolderOpen size={16} className={isCurrentDir ? 'text-cyber-primary' : 'text-amber-500'} />
                    ) : (
                        <Folder size={16} className={isCurrentDir ? 'text-cyber-primary' : 'text-amber-500'} />
                    )
                ) : (
                    <File size={14} className={
                        name.endsWith('.env') ? 'text-yellow-400' :
                            name.endsWith('.gitignore') ? 'text-gray-400' :
                                name.endsWith('.js') || name.endsWith('.ts') ? 'text-yellow-300' :
                                    name.endsWith('.py') ? 'text-blue-400' :
                                        name.endsWith('.md') ? 'text-blue-300' :
                                            'text-cyber-muted'
                    } />
                )}

                {/* Name */}
                <span className={`text-sm font-mono ${isCurrentDir ? 'font-bold' : ''}`}>
                    {name}
                </span>

                {/* Current Directory Indicator */}
                {isCurrentDir && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-cyber-primary">
                        <MapPin size={10} />
                        <span className="hidden group-hover:inline">you are here</span>
                    </span>
                )}

                {/* File size for files */}
                {!isDirectory && node.content && (
                    <span className="ml-auto text-xs text-cyber-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.content.length}b
                    </span>
                )}
            </div>

            {/* Children */}
            {isDirectory && isExpanded && node.children && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    {Object.entries(node.children)
                        .sort(([, a], [, b]) => {
                            const nodeA = a as FileNode;
                            const nodeB = b as FileNode;
                            // Directories first, then files
                            if (nodeA.type === 'directory' && nodeB.type !== 'directory') return -1;
                            if (nodeA.type !== 'directory' && nodeB.type === 'directory') return 1;
                            return 0;
                        })
                        .map(([childName, childNode]) => (
                            <TreeNode
                                key={childName}
                                name={childName}
                                node={childNode}
                                path={fullPath}
                                currentPath={currentPath}
                                depth={depth + 1}
                            />
                        ))
                    }
                    {Object.keys(node.children).length === 0 && (
                        <div
                            className="text-xs text-cyber-muted italic py-1 opacity-50"
                            style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                        >
                            (empty)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FileSystemTree: React.FC<FileSystemTreeProps> = ({ gameState }) => {
    const { fileSystem, cwd } = gameState;

    return (
        <div className="h-full flex flex-col bg-[#0f1115] overflow-hidden">
            {/* Header */}
            <div className="shrink-0 h-12 border-b border-white/5 bg-[#0c0c0e]/80 backdrop-blur flex items-center px-4 justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-cyber-muted uppercase tracking-wider">
                    <Terminal size={14} />
                    <span>File System</span>
                </div>
                <div className="text-xs text-cyber-secondary font-mono">
                    pwd: <span className="text-cyber-primary">{cwd}</span>
                </div>
            </div>

            {/* Tree View */}
            <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                <div className="text-xs text-cyber-muted mb-2 px-2 uppercase tracking-wider flex items-center gap-2">
                    <Folder size={12} />
                    Root
                </div>
                {Object.entries(fileSystem).map(([name, node]) => (
                    <TreeNode
                        key={name}
                        name={name}
                        node={node}
                        path=""
                        currentPath={cwd}
                        depth={0}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="shrink-0 border-t border-white/5 p-3 bg-[#0c0c0e]/50">
                <div className="flex items-center gap-4 text-xs text-cyber-muted">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-cyber-primary"></div>
                        <span>Current Dir</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Folder size={12} className="text-amber-500" />
                        <span>Directory</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <File size={12} className="text-cyber-muted" />
                        <span>File</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileSystemTree;
