// js/utils.js
export const PIXELS_PER_MPH = 1080 / 65;

export const mphToPixels = (mph) => mph * PIXELS_PER_MPH;

export const moveTowards = (current, target, maxDelta) => {
    if (current < target) {
        return Math.min(current + maxDelta, target);
    }
    if (current > target) {
        return Math.max(current - maxDelta, target);
    }
    return target;
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const signOrDefault = (value, fallback = 1) => {
    if (Math.abs(value) < 1e-6) return fallback;
    return value > 0 ? 1 : -1;
};