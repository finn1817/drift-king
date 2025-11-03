// js/ai-profiles.js
export const AI_PROFILES = {
    easy: {
        key: 'easy',
        displayName: 'Easy',
        throttleScale: 0.86,
        brakeScale: 1.1,
        steerResponsiveness: 0.85,
        jitter: 0.12,
        speedBonus: -4,
        aggression: 0.8,
        reaction: 0.35
    },
    medium: {
        key: 'medium',
        displayName: 'Medium',
        throttleScale: 1.0,
        brakeScale: 1.0,
        steerResponsiveness: 1.0,
        jitter: 0.07,
        speedBonus: 0,
        aggression: 1.0,
        reaction: 0.2
    },
    hard: {
        key: 'hard',
        displayName: 'Hard',
        throttleScale: 1.12,
        brakeScale: 0.85,
        steerResponsiveness: 1.25,
        jitter: 0.04,
        speedBonus: 4,
        aggression: 1.25,
        reaction: 0.12
    }
};