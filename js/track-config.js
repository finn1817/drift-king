// js/track-config.js
const TWO_PI = Math.PI * 2;

const createDaytonaConfig = () => {
    const worldWidth = 6200;
    const worldHeight = 3800;
    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const outerRadiusX = 2300;
    const outerRadiusY = 1300;
    const innerRadiusX = 1700;
    const innerRadiusY = 850;
    const midRadiusX = (outerRadiusX + innerRadiusX) / 2;
    const midRadiusY = (outerRadiusY + innerRadiusY) / 2;
    const segments = 64;
    const baseAngle = Math.PI / 2;

    const waypoints = [];
    for (let i = 0; i < segments; i++) {
        const t = baseAngle + (i / segments) * TWO_PI;
        const x = centerX + Math.cos(t) * midRadiusX;
        const y = centerY + Math.sin(t) * midRadiusY;
        waypoints.push({ x, y });
    }

    const laneSpacing = 120;
    const startY = centerY + midRadiusY - 60;
    const startPositions = [
        { x: centerX - laneSpacing * 0.5, y: startY, angle: -Math.PI / 2 },
        { x: centerX + laneSpacing * 0.5, y: startY, angle: -Math.PI / 2 }
    ];

    return {
        worldWidth,
        worldHeight,
        centerX,
        centerY,
        outerRadiusX,
        outerRadiusY,
        innerRadiusX,
        innerRadiusY,
        midRadiusX,
        midRadiusY,
        trackWidth: outerRadiusX - innerRadiusX,
        waypoints,
        startPositions
    };
};

export const DAYTONA_CONFIG = createDaytonaConfig();

export const TRACKS = {
    lot: {
        id: 'lot',
        name: 'The Lot',
        description: 'A wide-open parking lot tuned for drifting practice.',
        type: 'drift',
        worldWidth: 5200,
        worldHeight: 5200,
        cameraZoom: 0.8,
        startPositions: [{ x: 2600, y: 2600, angle: -Math.PI / 2 }],
        allowRain: true
    },
    daytona: {
        id: 'daytona',
        name: 'Sunset Speedway (Daytona Style)',
        description: 'High-speed oval with gentle banking. Includes AI rival.',
        type: 'race',
        worldWidth: DAYTONA_CONFIG.worldWidth,
        worldHeight: DAYTONA_CONFIG.worldHeight,
        cameraZoom: 0.63,
        allowRain: true,
        startPositions: DAYTONA_CONFIG.startPositions,
        outerRadiusX: DAYTONA_CONFIG.outerRadiusX,
        outerRadiusY: DAYTONA_CONFIG.outerRadiusY,
        innerRadiusX: DAYTONA_CONFIG.innerRadiusX,
        innerRadiusY: DAYTONA_CONFIG.innerRadiusY,
        midRadiusX: DAYTONA_CONFIG.midRadiusX,
        midRadiusY: DAYTONA_CONFIG.midRadiusY,
        centerX: DAYTONA_CONFIG.centerX,
        centerY: DAYTONA_CONFIG.centerY,
        trackWidth: DAYTONA_CONFIG.trackWidth,
        race: {
            laps: 3,
            waypointRadius: 240,
            waypoints: DAYTONA_CONFIG.waypoints,
            aiCount: 1
        }
    }
};