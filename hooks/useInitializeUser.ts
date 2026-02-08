
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../services/supabaseClient';
import { UserProgress, UserProfile, MissionCompleted } from '../types';

export const useInitializeUser = () => {
    const { user, isLoaded } = useUser();
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = async () => {
        if (!isLoaded || !user) {
            setLoading(false);
            return;
        }

        try {
            // 1. Get Profile
            let profileData: UserProfile | null = null;

            const { data: existingProfile, error } = await supabase
                .from('users_profile')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (existingProfile) {
                profileData = existingProfile;
            } else {
                // Create new profile
                const newProfile = {
                    user_id: user.id,
                    username: user.fullName || user.username || 'Cadet',
                    avatar_url: user.imageUrl,
                    xp: 0,
                    level: 1,
                    streak: 0,
                    badges: [],
                    last_active: new Date().toISOString()
                };

                const { data: inserted } = await supabase
                    .from('users_profile')
                    .insert([newProfile])
                    .select()
                    .single();

                if (inserted) profileData = inserted;
            }

            // 2. Get Completed Missions
            const { data: missions } = await supabase
                .from('missions_completed')
                .select('mission_id')
                .eq('user_id', user.id);

            const completedMissionIds = missions?.map((m: any) => m.mission_id) || [];

            // 3. Construct UserProgress
            if (profileData) {
                setProgress({
                    xp: profileData.xp,
                    streak: profileData.streak,
                    level: profileData.level,
                    completedMissions: completedMissionIds,
                    badges: profileData.badges || [],
                    lastActiveDate: profileData.last_active,
                    username: profileData.username,
                    avatarSeed: profileData.avatar_url // Use URL as seed/source
                });
            }

        } catch (err) {
            console.error('Error syncing user:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, [user, isLoaded]);

    // Expose a refetch function
    const refreshProgress = fetchUserData;

    return { progress, loading, refreshProgress };
};
