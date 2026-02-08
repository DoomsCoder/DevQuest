import React, { useState, useMemo } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { Mission, UserProgress } from '../types';
import { GitBranch, Terminal, Shield, Zap, Lock, Play, Trophy, Search, CheckCircle, Cpu } from 'lucide-react';

interface DashboardProps {
    startMission: (id: string) => void;
    missions: Mission[];
    userProgress: UserProgress;
}

type CategoryFilter = 'All' | 'Git' | 'Terminal' | 'Core';
type DifficultyFilter = 'All' | 'Beginner' | 'Intermediate' | 'Expert';

const Dashboard: React.FC<DashboardProps> = ({ startMission, missions, userProgress }) => {
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter missions based on current filters
    const filteredMissions = useMemo(() => {
        return missions.filter(mission => {
            // Category filter
            if (categoryFilter !== 'All' && mission.category !== categoryFilter) return false;

            // Difficulty filter  
            if (difficultyFilter !== 'All' && mission.difficulty !== difficultyFilter) return false;

            // Search filter (case-insensitive)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = mission.title.toLowerCase().includes(query);
                const matchesDesc = mission.description.toLowerCase().includes(query);
                if (!matchesTitle && !matchesDesc) return false;
            }

            return true;
        });
    }, [missions, categoryFilter, difficultyFilter, searchQuery]);

    // Group filtered missions by category and sort by difficulty
    const groupedMissions: Record<string, Mission[]> = useMemo(() => {
        const groups: Record<string, Mission[]> = {};

        // Define difficulty order for sorting
        const difficultyOrder: Record<string, number> = {
            'Beginner': 1,
            'Intermediate': 2,
            'Expert': 3
        };

        filteredMissions.forEach(mission => {
            if (!groups[mission.category]) groups[mission.category] = [];
            groups[mission.category].push(mission);
        });

        // Sort missions within each category by difficulty
        Object.keys(groups).forEach(category => {
            groups[category].sort((a, b) => {
                const orderA = difficultyOrder[a.difficulty] || 99;
                const orderB = difficultyOrder[b.difficulty] || 99;
                return orderA - orderB;
            });
        });

        return groups;
    }, [filteredMissions]);

    const categoryTabs: { label: CategoryFilter; icon: React.ReactNode; color: string }[] = [
        { label: 'All', icon: null, color: 'bg-white/10 border-white/20 text-white' },
        { label: 'Git', icon: <GitBranch size={14} />, color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
        { label: 'Terminal', icon: <Terminal size={14} />, color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
        { label: 'Core', icon: <Cpu size={14} />, color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
    ];

    const difficultyTabs: DifficultyFilter[] = ['All', 'Beginner', 'Intermediate', 'Expert'];

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Git': return <GitBranch size={20} />;
            case 'Terminal': return <Terminal size={20} />;
            case 'Core': return <Cpu size={20} />;
            default: return <Shield size={20} />;
        }
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'Git': return 'bg-orange-500/20 text-orange-500';
            case 'Terminal': return 'bg-blue-500/20 text-blue-500';
            case 'Core': return 'bg-purple-500/20 text-purple-500';
            default: return 'bg-white/20 text-white';
        }
    };

    // Calculate progress stats
    const totalMissions = missions.length;
    const completedCount = userProgress.completedMissions.length;
    const progressPercent = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

    return (
        <div className="min-h-screen bg-cyber-bg font-sans text-cyber-text selection:bg-cyber-primary selection:text-black">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 glass border-b border-white/5 bg-cyber-bg/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-cyber-primary to-emerald-600 flex items-center justify-center font-bold text-black">
                            DQ
                        </div>
                        <span className="font-bold text-lg tracking-tight">DevQuest</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Level Badge and Progress */}
                        <div className="hidden md:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-accent/10 border border-cyber-accent/20 text-cyber-accent text-sm font-medium">
                                <span className="text-xs">LVL</span>
                                <span className="font-bold">{userProgress.level}</span>
                            </div>
                            {/* XP Progress Bar */}
                            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden" title={`${(userProgress.xp % 200)} / 200 XP to Level ${userProgress.level + 1}`}>
                                <div
                                    className="h-full bg-cyber-accent transition-all duration-500"
                                    style={{ width: `${((userProgress.xp % 200) / 200) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Earned Badges */}
                        {userProgress.badges && userProgress.badges.length > 0 && (
                            <div className="hidden md:flex items-center gap-1" title={`${userProgress.badges.length} badge${userProgress.badges.length !== 1 ? 's' : ''} earned`}>
                                {userProgress.badges.slice(0, 4).map((badgeId, i) => {
                                    const badgeIcons: Record<string, string> = {
                                        'first_commit': '🎯',
                                        'git_master': '🌳',
                                        'terminal_pro': '⌨️',
                                        'level_up': '⬆️',
                                        'streak_3': '🔥',
                                        'xp_500': '💎',
                                        'branch_master': '🌿',
                                        'merge_complete': '🔀',
                                    };
                                    return (
                                        <div
                                            key={badgeId}
                                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform cursor-default"
                                            title={badgeId.replace(/_/g, ' ')}
                                        >
                                            {badgeIcons[badgeId] || '🏅'}
                                        </div>
                                    );
                                })}
                                {userProgress.badges.length > 4 && (
                                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs text-cyber-muted">
                                        +{userProgress.badges.length - 4}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium" title="Complete a mission every day to build your streak!">
                            <Zap size={14} className="fill-current" />
                            <span>{userProgress.streak} Day Streak</span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary text-sm font-medium">
                            <Trophy size={14} />
                            <span>{userProgress.xp} XP</span>
                        </div>

                        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-white">{userProgress.username}</div>
                                <div className="text-xs text-cyber-muted">Cadet</div>
                            </div>
                            <div className={`flex items-center justify-center rounded-full border-2 overflow-hidden ${userProgress.level >= 5 ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' :
                                userProgress.level >= 3 ? 'border-cyber-primary shadow-[0_0_10px_rgba(0,220,130,0.5)]' :
                                    'border-white/10'
                                }`}>
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-9 h-9",
                                            userButtonTrigger: "focus:shadow-none"
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section with Progress */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Cadet.</h1>
                        <p className="text-cyber-muted">Choose a protocol to continue your training.</p>
                    </div>
                    {/* Progress indicator */}
                    <div className="flex items-center gap-4 bg-cyber-card/50 rounded-xl px-5 py-3 border border-white/5">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-cyber-primary">{completedCount}</div>
                            <div className="text-xs text-cyber-muted">Completed</div>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{totalMissions}</div>
                            <div className="text-xs text-cyber-muted">Total</div>
                        </div>
                        <div className="w-[1px] h-8 bg-white/10"></div>
                        <div className="w-20">
                            <div className="text-xs text-cyber-muted mb-1">{progressPercent}%</div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyber-primary to-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                        <input
                            type="text"
                            placeholder="Search missions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-cyber-card/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-cyber-muted focus:outline-none focus:border-cyber-primary/50 transition-colors"
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Category Tabs */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-cyber-muted uppercase tracking-wider mr-2">Category:</span>
                            {categoryTabs.map(({ label, icon, color }) => (
                                <button
                                    key={label}
                                    onClick={() => setCategoryFilter(label)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${categoryFilter === label
                                        ? color + ' shadow-lg'
                                        : 'bg-transparent border-white/10 text-cyber-muted hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Difficulty Tabs */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-cyber-muted uppercase tracking-wider mr-2 ml-4">Difficulty:</span>
                            {difficultyTabs.map(diff => (
                                <button
                                    key={diff}
                                    onClick={() => setDifficultyFilter(diff)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${difficultyFilter === diff
                                        ? diff === 'Beginner' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                                            diff === 'Intermediate' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                                diff === 'Expert' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                                    'bg-white/10 border-white/20 text-white'
                                        : 'bg-transparent border-white/10 text-cyber-muted hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* No Results Message */}
                {filteredMissions.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-white mb-2">No missions found</h3>
                        <p className="text-cyber-muted">Try adjusting your filters or search query.</p>
                        <button
                            onClick={() => { setCategoryFilter('All'); setDifficultyFilter('All'); setSearchQuery(''); }}
                            className="mt-4 px-4 py-2 bg-cyber-primary/20 text-cyber-primary rounded-lg hover:bg-cyber-primary/30 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Mission Grid */}
                <div className="space-y-12">
                    {Object.entries(groupedMissions).map(([category, categoryMissions]) => (
                        <section key={category} className="relative">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                                    {getCategoryIcon(category)}
                                </div>
                                <h2 className="text-xl font-bold text-white">{category} Mastery</h2>
                                <div className="text-xs text-cyber-muted bg-white/5 px-2 py-1 rounded">
                                    {categoryMissions.length} mission{categoryMissions.length !== 1 ? 's' : ''}
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categoryMissions.map((mission) => {
                                    const isCompleted = userProgress.completedMissions.includes(mission.id);

                                    return (
                                        <div
                                            key={mission.id}
                                            className={`group relative glass-card rounded-xl p-1 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${isCompleted ? 'ring-1 ring-cyber-primary/30' : 'hover:shadow-glow-blue'
                                                }`}
                                        >
                                            {/* Completed Banner */}
                                            {isCompleted && (
                                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-cyber-primary/20 text-cyber-primary text-xs font-bold px-2 py-1 rounded-full">
                                                    <CheckCircle size={12} />
                                                    COMPLETED
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="bg-cyber-bg/50 h-full rounded-lg p-5 flex flex-col relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${mission.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        mission.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {mission.difficulty}
                                                    </div>
                                                    <div className="text-cyber-muted text-xs font-mono">{mission.xp} XP</div>
                                                </div>

                                                <h3 className={`text-lg font-bold mb-2 group-hover:text-cyber-secondary transition-colors ${isCompleted ? 'text-cyber-muted' : 'text-white'
                                                    }`}>
                                                    {mission.title}
                                                </h3>
                                                <p className="text-sm text-cyber-muted mb-6 flex-1">
                                                    {mission.description}
                                                </p>

                                                <button
                                                    onClick={() => startMission(mission.id)}
                                                    className={`w-full py-3 rounded font-medium text-sm transition-all flex items-center justify-center gap-2 ${isCompleted
                                                        ? 'bg-white/5 border border-white/10 text-cyber-muted hover:bg-white/10 hover:text-white'
                                                        : 'bg-white/5 hover:bg-cyber-primary hover:text-black border border-white/10 hover:border-cyber-primary group-hover:shadow-[0_0_15px_rgba(0,220,130,0.3)]'
                                                        }`}
                                                >
                                                    <Play size={16} className="fill-current" />
                                                    {isCompleted ? 'Review Mission' : 'Start Mission'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
