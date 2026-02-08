
import React, { useState, useEffect } from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { useInitializeUser } from './hooks/useInitializeUser';
import { calculateLevel, calculateStreak } from './utils/gameUtils';
import { MISSIONS, BADGES, Badge } from './data/missions';
import { GameView, UserProgress } from './types';

// Components
import Dashboard from './components/Dashboard';
import MissionView from './components/MissionView';
import { LevelUpCelebration } from './components/LevelUpCelebration';
import { BadgeUnlocked } from './components/BadgeUnlocked';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingPage } from './components/LandingPage';
import { XPGainAnimation } from './components/XPGainAnimation';

const ONBOARDING_KEY = 'dq_has_seen_onboarding';

const App: React.FC = () => {
    // Parse initial route from URL
    const getRouteFromURL = (): { view: GameView; missionId: string | null } => {
        const path = window.location.pathname;
        if (path.startsWith('/mission/')) {
            const missionId = path.replace('/mission/', '');
            if (MISSIONS.find(m => m.id === missionId)) {
                return { view: GameView.MISSION, missionId };
            }
        }
        if (path === '/dashboard') {
            return { view: GameView.DASHBOARD, missionId: null };
        }
        return { view: GameView.LANDING, missionId: null };
    };

    const initialRoute = getRouteFromURL();
    const [view, setView] = useState<GameView>(initialRoute.view);
    const [currentMissionId, setCurrentMissionId] = useState<string | null>(initialRoute.missionId);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
    const [newBadge, setNewBadge] = useState<Badge | null>(null);
    const [xpGained, setXpGained] = useState<number | null>(null);

    // Auth & DB Hooks
    const { user, isSignedIn } = useUser();
    const { progress: dbProgress, loading: profileLoading } = useInitializeUser();

    // Local state for optimistic updates
    const [progress, setProgress] = useState<UserProgress | null>(null);

    // Sync local state with DB state
    useEffect(() => {
        if (dbProgress) {
            setProgress(dbProgress);
        }
    }, [dbProgress]);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const route = getRouteFromURL();
            setView(route.view);
            setCurrentMissionId(route.missionId);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Navigate with URL update
    const navigate = (newView: GameView, missionId: string | null = null) => {
        let path = '/';
        if (newView === GameView.DASHBOARD) path = '/dashboard';
        else if (newView === GameView.MISSION && missionId) path = `/mission/${missionId}`;

        window.history.pushState({ view: newView, missionId }, '', path);
        setView(newView);
        setCurrentMissionId(missionId);
    };

    const startMission = (id: string) => {
        navigate(GameView.MISSION, id);
    };

    const handleMissionComplete = async (missionXP: number) => {
        if (!progress || !user) return;

        // Check if mission was already completed -> NO new XP
        if (progress.completedMissions.includes(currentMissionId!)) {
            return;
        }

        // Show XP gain animation
        setXpGained(missionXP);
        setTimeout(() => setXpGained(null), 3000);

        const oldLevel = progress.level;
        const newXP = progress.xp + missionXP;
        const newLevel = calculateLevel(newXP);
        const newBadges = [...progress.badges];

        // Update streak
        const newStreak = calculateStreak(progress.lastActiveDate, progress.streak);

        // Check for badge unlocks
        // First Commit badge - first mission completed
        if (progress.completedMissions.length === 0 && !newBadges.includes('first_commit')) {
            newBadges.push('first_commit');
            setNewBadge(BADGES.find(b => b.id === 'first_commit') || null);
        }

        // Git Master - all Git missions
        const gitMissions = MISSIONS.filter(m => m.category === 'Git');
        const completedGit = [...progress.completedMissions, currentMissionId!].filter(id =>
            gitMissions.some(m => m.id === id)
        );
        if (completedGit.length >= gitMissions.length && !newBadges.includes('git_master')) {
            newBadges.push('git_master');
            setTimeout(() => setNewBadge(BADGES.find(b => b.id === 'git_master') || null), 2000);
        }

        // XP Hunter - 500+ XP
        if (newXP >= 500 && !newBadges.includes('xp_500')) {
            newBadges.push('xp_500');
            setTimeout(() => setNewBadge(BADGES.find(b => b.id === 'xp_500') || null), 2000);
        }

        // Level Up badge - reached level 2+
        if (newLevel >= 2 && !newBadges.includes('level_up')) {
            newBadges.push('level_up');
        }

        // Branch Master - hydra merge mission
        if (currentMissionId === 'git-3' && !newBadges.includes('merge_complete')) {
            newBadges.push('merge_complete');
            setTimeout(() => setNewBadge(BADGES.find(b => b.id === 'merge_complete') || null), 2000);
        }

        // Show level up celebration if leveled up
        if (newLevel > oldLevel) {
            setTimeout(() => setShowLevelUp(newLevel), 500);
        }

        // Optimistic Update
        setProgress({
            ...progress,
            xp: newXP,
            level: newLevel,
            completedMissions: [...progress.completedMissions, currentMissionId!],
            badges: newBadges,
            lastActiveDate: new Date().toISOString(),
            streak: newStreak
        });

        // Supabase Persistence
        try {
            await supabase.from('users_profile').update({
                xp: newXP,
                level: newLevel,
                streak: newStreak,
                last_active: new Date().toISOString(),
                badges: newBadges
            }).eq('user_id', user.id);

            await supabase.from('missions_completed').insert({
                user_id: user.id,
                mission_id: currentMissionId!,
                xp_earned: missionXP,
                completed_at: new Date().toISOString()
            });
        } catch (err) {
            console.error("Failed to save progress:", err);
        }
    };

    const exitMission = () => {
        navigate(GameView.DASHBOARD);
    };

    const activeMission = MISSIONS.find(m => m.id === currentMissionId);

    // Initial check for onboarding
    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasSeenOnboarding && view === GameView.DASHBOARD) {
            // Only show usually on first visit to Dashboard
            // But if we start with Landing, we show it later.
            // Keep simple: if not seen, check logic
        }
    }, [view]);

    const handleStart = () => {
        const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
            localStorage.setItem(ONBOARDING_KEY, 'true');
        }
        navigate(GameView.DASHBOARD);
    };

    // Loading State
    if (isSignedIn && (profileLoading || !progress)) {
        return (
            <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-cyber-primary w-12 h-12" />
                    <div className="text-cyber-muted animate-pulse">Establishing Uplink...</div>
                </div>
            </div>
        );
    }

    if (view === GameView.LANDING) {
        return <LandingPage onStart={handleStart} />;
    }

    if (view === GameView.MISSION && activeMission) {
        return (
            <>
                <SignedIn>
                    <MissionView
                        mission={activeMission}
                        onExit={exitMission}
                        onComplete={handleMissionComplete}
                        userProgress={progress}
                    />
                </SignedIn>
                <SignedOut>
                    <RedirectToSignIn afterSignInUrl={window.location.pathname} />
                </SignedOut>
            </>
        );
    }

    return (
        <>
            {/* Global XP Gain Animation */}
            {xpGained && <XPGainAnimation xp={xpGained} />}

            {showLevelUp && <LevelUpCelebration level={showLevelUp} onClose={() => setShowLevelUp(null)} />}
            {newBadge && <BadgeUnlocked badge={newBadge} onClose={() => setNewBadge(null)} />}
            {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}

            <SignedIn>
                {progress && (
                    <Dashboard
                        startMission={startMission}
                        missions={MISSIONS}
                        userProgress={progress}
                    />
                )}
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn afterSignInUrl="/dashboard" />
            </SignedOut>
        </>
    );
};

export default App;
