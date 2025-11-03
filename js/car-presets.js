// js/car-presets.js
import { mphToPixels } from './utils.js';

const createSchemes = (baseSchemes) =>
    baseSchemes.map((scheme, index) => ({
        order: index,
        ...scheme
    }));

export const CAR_TYPES = {
    drift: {
        id: 'drift',
        name: 'Drift King',
        description: 'Rear-biased setup built to hold long slides.',
        topSpeedMph: 66,
        topSpeed: mphToPixels(66),
        engineForce: mphToPixels(34),
        brakeForce: mphToPixels(60),
        handbrakeForce: mphToPixels(94),
        maxReverseSpeed: mphToPixels(28),
        mass: 1180,
        inertia: 2600,
        cgToFront: 88,
        cgToRear: 102,
        cornerStiffnessFront: 7200,
        cornerStiffnessRear: 5200,
        maxLateralForce: 13200,
        maxSteerAngle: 36,
        steerRate: 6.8,
        lateralDamping: 3.9,
        angularDamping: 2.8,
        longitudinalDrag: 0.25,
        rollingResistance: 7.2,
        health: 320,
        durability: 1.18,
        schemes: createSchemes([
            {
                id: 'crimson',
                name: 'Crimson Katana',
                paint: {
                    base: 0xc83434,
                    secondary: 0x0d0d0d,
                    accent: 0xffffff,
                    decal: 'katana'
                }
            },
            {
                id: 'midnight',
                name: 'Midnight Prism',
                paint: {
                    base: 0x181c38,
                    secondary: 0x06070b,
                    accent: 0x8ad4ff,
                    decal: 'dualStripe'
                }
            },
            {
                id: 'sunburst',
                name: 'Sunburst Apex',
                paint: {
                    base: 0xff9d3c,
                    secondary: 0x2a1404,
                    accent: 0xfff7d5,
                    decal: 'speedChevron'
                }
            }
        ])
    },
    balanced: {
        id: 'balanced',
        name: 'Apex GT',
        description: 'Stable all-rounder tuned for consistency.',
        topSpeedMph: 70,
        topSpeed: mphToPixels(70),
        engineForce: mphToPixels(36),
        brakeForce: mphToPixels(70),
        handbrakeForce: mphToPixels(82),
        maxReverseSpeed: mphToPixels(27),
        mass: 1240,
        inertia: 2850,
        cgToFront: 92,
        cgToRear: 96,
        cornerStiffnessFront: 8300,
        cornerStiffnessRear: 7700,
        maxLateralForce: 14400,
        maxSteerAngle: 32,
        steerRate: 6.2,
        lateralDamping: 4.6,
        angularDamping: 3.0,
        longitudinalDrag: 0.23,
        rollingResistance: 7.0,
        health: 340,
        durability: 1.26,
        schemes: createSchemes([
            {
                id: 'glacier',
                name: 'Glacier Blue',
                paint: {
                    base: 0x2874ff,
                    secondary: 0x0f1b33,
                    accent: 0xf7f9ff,
                    decal: 'dualStripe'
                }
            },
            {
                id: 'ember',
                name: 'Ember Pulse',
                paint: {
                    base: 0xff5e2f,
                    secondary: 0x1d0b05,
                    accent: 0xfff1e8,
                    decal: 'speedChevron'
                }
            },
            {
                id: 'sage',
                name: 'Sage Runner',
                paint: {
                    base: 0x3fd48f,
                    secondary: 0x143225,
                    accent: 0xf0ffef,
                    decal: 'dualStripe'
                }
            }
        ])
    },
    speedster: {
        id: 'speedster',
        name: 'Velocity RS',
        description: 'Higher top-end and lighter weight for sprints.',
        topSpeedMph: 75,
        topSpeed: mphToPixels(75),
        engineForce: mphToPixels(34),
        brakeForce: mphToPixels(58),
        handbrakeForce: mphToPixels(96),
        maxReverseSpeed: mphToPixels(25),
        mass: 1160,
        inertia: 2450,
        cgToFront: 94,
        cgToRear: 90,
        cornerStiffnessFront: 7600,
        cornerStiffnessRear: 6200,
        maxLateralForce: 12800,
        maxSteerAngle: 31,
        steerRate: 6.9,
        lateralDamping: 3.6,
        angularDamping: 2.5,
        longitudinalDrag: 0.29,
        rollingResistance: 6.2,
        health: 300,
        durability: 1.05,
        schemes: createSchemes([
            {
                id: 'flare',
                name: 'Accelerant Flare',
                paint: {
                    base: 0xff8b1f,
                    secondary: 0x1b120c,
                    accent: 0xfef2d5,
                    decal: 'speedChevron'
                }
            },
            {
                id: 'aurora',
                name: 'Aurora Shift',
                paint: {
                    base: 0x9b5bff,
                    secondary: 0x180b26,
                    accent: 0xe6d4ff,
                    decal: 'dualStripe'
                }
            },
            {
                id: 'onyx',
                name: 'Onyx Trail',
                paint: {
                    base: 0x111111,
                    secondary: 0x2c2c2c,
                    accent: 0x7df2ff,
                    decal: 'katana'
                }
            }
        ])
    },
    endurance: {
        id: 'endurance',
        name: 'Bulldog SX',
        description: 'Durable bruiser with dependable grip.',
        topSpeedMph: 63,
        topSpeed: mphToPixels(63),
        engineForce: mphToPixels(36),
        brakeForce: mphToPixels(74),
        handbrakeForce: mphToPixels(72),
        maxReverseSpeed: mphToPixels(24),
        mass: 1340,
        inertia: 3150,
        cgToFront: 86,
        cgToRear: 112,
        cornerStiffnessFront: 8900,
        cornerStiffnessRear: 8300,
        maxLateralForce: 15200,
        maxSteerAngle: 30,
        steerRate: 5.5,
        lateralDamping: 5.1,
        angularDamping: 3.4,
        longitudinalDrag: 0.22,
        rollingResistance: 8.1,
        health: 380,
        durability: 1.4,
        schemes: createSchemes([
            {
                id: 'granite',
                name: 'Granite Surge',
                paint: {
                    base: 0x4ad05f,
                    secondary: 0x17311d,
                    accent: 0xdfffdc,
                    decal: 'enduranceBadge'
                }
            },
            {
                id: 'steelwave',
                name: 'Steel Wave',
                paint: {
                    base: 0x4c6aff,
                    secondary: 0x101742,
                    accent: 0xdfe6ff,
                    decal: 'dualStripe'
                }
            },
            {
                id: 'copper',
                name: 'Copper Forge',
                paint: {
                    base: 0xc26b2b,
                    secondary: 0x2f1a07,
                    accent: 0xf8dec6,
                    decal: 'enduranceBadge'
                }
            }
        ])
    }
};

export const listCarOptions = () => Object.values(CAR_TYPES);

export const getDefaultSchemeId = (carId) => {
    const car = CAR_TYPES[carId];
    return car?.schemes?.[0]?.id ?? null;
};

export const getCarScheme = (carId, schemeId) => {
    const car = CAR_TYPES[carId];
    if (!car) return null;
    return car.schemes.find((scheme) => scheme.id === schemeId) ?? car.schemes[0];
};

export const getCarDisplayName = (carId, schemeId) => {
    const car = CAR_TYPES[carId];
    if (!car) return '--';
    const scheme = schemeId ? getCarScheme(carId, schemeId) : null;
    return scheme ? `${car.name} • ${scheme.name}` : car.name;
};