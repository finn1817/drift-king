// js/session-state.js
import { CAR_TYPES } from './car-presets.js';

const defaultCarId = 'drift';
const defaultSchemeId = CAR_TYPES[defaultCarId].schemes[0].id;

const DEFAULT_SETTINGS = Object.freeze({
    trackId: 'daytona',
    carId: defaultCarId,
    schemeId: defaultSchemeId,
    aiCount: 1,
    aiDifficulty: 'medium'
});

let currentSettings = { ...DEFAULT_SETTINGS };

export const getDefaultSettings = () => ({ ...DEFAULT_SETTINGS });

export const getSessionSettings = () => ({ ...currentSettings });

export const setSessionSettings = (partial) => {
    currentSettings = { ...currentSettings, ...partial };
    return getSessionSettings();
};

export const resetSessionSettings = () => {
    currentSettings = { ...DEFAULT_SETTINGS };
    return getSessionSettings();
};