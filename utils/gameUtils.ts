
export const calculateLevel = (xp: number): number => {
    if (xp >= 2000) return 5;
    if (xp >= 1000) return 4;
    if (xp >= 500) return 3;
    if (xp >= 200) return 2;
    return 1;
};

export const calculateStreak = (lastActiveDate: string, currentStreak: number): number => {
    if (!lastActiveDate) return 1;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = new Date(lastActiveDate).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastActive === today) {
        return currentStreak;
    } else if (lastActive === yesterday) {
        return currentStreak + 1;
    } else {
        return 1;
    }
};
