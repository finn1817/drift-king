// js/vehicle-factory.js
import { CAR_TYPES, getCarScheme } from './car-presets.js';

export const spawnCar = (scene, {
    carId = 'drift',
    schemeId = null,
    x = 0,
    y = 0,
    angle = 0,
    isAI = false,
    name = null,
    isRaceTrack = false,
    customPhysics = {}
} = {}) => {
    const carData = CAR_TYPES[carId] || CAR_TYPES.drift;
    const scheme = getCarScheme(carData.id, schemeId) || carData.schemes[0];
    const textureKey = `car_${carData.id}_${scheme.id}`;

    // Apply custom physics multipliers to car data
    const modifiedCarData = { ...carData };
    if (customPhysics.engineForce) {
        modifiedCarData.engineForce = carData.engineForce * customPhysics.engineForce;
    }
    if (customPhysics.brakeForce) {
        modifiedCarData.brakeForce = carData.brakeForce * customPhysics.brakeForce;
    }
    if (customPhysics.maxSteerAngle) {
        modifiedCarData.maxSteerAngle = carData.maxSteerAngle * customPhysics.maxSteerAngle;
    }
    if (customPhysics.cornerStiffness) {
        modifiedCarData.cornerStiffnessFront = carData.cornerStiffnessFront * customPhysics.cornerStiffness;
        modifiedCarData.cornerStiffnessRear = carData.cornerStiffnessRear * customPhysics.cornerStiffness;
    }
    if (customPhysics.mass) {
        modifiedCarData.mass = carData.mass * customPhysics.mass;
    }

    const sprite = scene.physics.add.image(x, y, textureKey);
    sprite.setOrigin(0.5);
    sprite.setRotation(angle);
    sprite.setCollideWorldBounds(true);
    sprite.body.setAllowRotation(false);
    sprite.body.setBounce(0.08);
    sprite.body.setDrag(0, 0);
    sprite.body.setSize(120, 46, true);
    sprite.body.setOffset((sprite.width - 120) / 2, (sprite.height - 46) / 2);
    sprite.setDepth(2);

    const car = {
        id: carId,
        schemeId: scheme.id,
        scheme,
        data: modifiedCarData,
        sprite,
        isAI,
        name: name || `${carData.name}`,
        localVelocity: new Phaser.Math.Vector2(0, 0),
        angularVelocity: 0,
        currentSteer: 0,
        lastDriftDir: 1,
        speed: 0,
        carSpeedMph: 0,
        health: modifiedCarData.health || 320,
        maxHealth: modifiedCarData.health || 320,
        durability: modifiedCarData.durability || 1,
        lap: isRaceTrack ? 1 : 0,
        prevWaypoint: null,
        nextWaypoint: 0,
        raceProgress: 0,
        finished: false,
        retired: false,
        position: 1,
        lastBoundaryHit: 0,
        aiMeta: {}
    };

    sprite.setData('carRef', car);
    return car;
};