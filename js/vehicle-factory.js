// js/vehicle-factory.js
import { CAR_TYPES } from './car-presets.js';

export const spawnCar = (scene, {
    carId = 'drift',
    x = 0,
    y = 0,
    angle = 0,
    isAI = false,
    name = null,
    isRaceTrack = false
} = {}) => {
    const carData = CAR_TYPES[carId] || CAR_TYPES.drift;
    const textureKey = `car_${carData.id}`;

    const sprite = scene.physics.add.image(x, y, textureKey);
    sprite.setOrigin(0.5);
    sprite.setRotation(angle);
    sprite.setCollideWorldBounds(true);
    sprite.body.setAllowRotation(false);
    sprite.body.setBounce(0.05);
    sprite.body.setDrag(0, 0);
    sprite.body.setSize(120, 46, true);
    sprite.body.setOffset((sprite.width - 120) / 2, (sprite.height - 46) / 2);
    sprite.setDepth(1);

    const car = {
        id: carId,
        data: carData,
        sprite,
        isAI,
        name: name || carData.name,
        localVelocity: new Phaser.Math.Vector2(0, 0),
        angularVelocity: 0,
        currentSteer: 0,
        lastDriftDir: 1,
        speed: 0,
        carSpeedMph: 0,
        health: carData.health || 100,
        maxHealth: carData.health || 100,
        lap: isRaceTrack ? 1 : 0,
        prevWaypoint: null,
        nextWaypoint: 0,
        raceProgress: 0,
        finished: false,
        retired: false,
        position: 1,
        lastBoundaryHit: 0
    };

    sprite.setData('carRef', car);
    return car;
};