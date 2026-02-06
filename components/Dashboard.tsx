import React from 'react';
import { Mission, UserProgress } from '../types';
import { GitBranch, Terminal, Shield, Zap, Lock, Play, Trophy } from 'lucide-react';

interface DashboardProps {
  startMission: (id: string) => void;
  missions: Mission[];
  userProgress: UserProgress;
}

const Dashboard: React.FC<DashboardProps> = ({ startMission, missions, userProgress }) => {
  const categories = ['Git', 'Terminal', 'Core'];

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
           
           <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                    <Zap size={14} className="fill-current" />
                    <span>{userProgress.streak} Day Streak</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary text-sm font-medium">
                    <Trophy size={14} />
                    <span>{userProgress.xp} XP</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-cyber-card border border-white/10 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="Avatar" />
                </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Cadet.</h1>
            <p className="text-cyber-muted">Choose a protocol to continue your training.</p>
        </div>

        {/* Learning Tracks */}
        <div className="space-y-16">
            {categories.map(cat => {
                const catMissions = missions.filter(m => m.category === cat);
                if (catMissions.length === 0) return null;

                return (
                    <section key={cat} className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-lg ${cat === 'Git' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                {cat === 'Git' ? <GitBranch size={20}/> : <Terminal size={20}/>}
                            </div>
                            <h2 className="text-xl font-bold text-white">{cat} Mastery</h2>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {catMissions.map((mission, idx) => (
                                <div 
                                    key={mission.id} 
                                    className="group relative glass-card rounded-xl p-1 overflow-hidden transition-all duration-300 hover:shadow-glow-blue hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="bg-cyber-bg/50 h-full rounded-lg p-5 flex flex-col relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                                mission.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' : 
                                                mission.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {mission.difficulty}
                                            </div>
                                            {idx > 0 && !userProgress.completedMissions.includes(catMissions[idx-1].id) ? (
                                                <Lock size={16} className="text-cyber-muted"/>
                                            ) : (
                                                <div className="text-cyber-muted text-xs font-mono">{mission.xp} XP</div>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyber-secondary transition-colors">
                                            {mission.title}
                                        </h3>
                                        <p className="text-sm text-cyber-muted mb-6 flex-1">
                                            {mission.description}
                                        </p>

                                        <button 
                                            onClick={() => startMission(mission.id)}
                                            className="w-full py-3 rounded bg-white/5 hover:bg-cyber-primary hover:text-black border border-white/10 hover:border-cyber-primary font-medium text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(0,220,130,0.3)]"
                                        >
                                            <Play size={16} className="fill-current" />
                                            Start Mission
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
