// js/vehicle-physics.js
import { PIXELS_PER_MPH, moveTowards, signOrDefault } from './utils.js';

const syncLocalVelocityFromBody = (car) => {
    const sprite = car.sprite;
    const bodyVel = sprite.body.velocity;
    const sin = Math.sin(sprite.rotation);
    const cos = Math.cos(sprite.rotation);

    const observedForward = cos * bodyVel.x + sin * bodyVel.y;
    const observedLateral = -sin * bodyVel.x + cos * bodyVel.y;

    car.localVelocity.x = Phaser.Math.Linear(car.localVelocity.x, observedForward, 0.18);
    car.localVelocity.y = Phaser.Math.Linear(car.localVelocity.y, observedLateral, 0.18);
};

export const applyCarPhysics = (car, control, dt, surfaceGrip = 1) => {
    if (!car || car.retired) return;

    const sprite = car.sprite;
    const data = car.data;

    syncLocalVelocityFromBody(car);

    const maxSteer = Phaser.Math.DegToRad(data.maxSteerAngle || 32);
    const desiredSteer = Phaser.Math.Clamp(control.steer, -1, 1) * maxSteer;
    car.currentSteer = Phaser.Math.Angle.RotateTo(car.currentSteer || 0, desiredSteer, data.steerRate * dt);

    if (control.reverse) {
        car.localVelocity.x = moveTowards(car.localVelocity.x, -data.maxReverseSpeed, data.engineForce * 0.55 * dt);
    } else {
        car.localVelocity.x += data.engineForce * Phaser.Math.Clamp(control.throttle, 0, 1.2) * dt;
    }

    if (control.brake > 0) {
        const brakeEffect = data.brakeForce * control.brake * dt;
        car.localVelocity.x = moveTowards(car.localVelocity.x, 0, brakeEffect);
    }

    const longDrag = data.longitudinalDrag || 0.24;
    car.localVelocity.x -= car.localVelocity.x * longDrag * dt;

    const speedSign = car.localVelocity.x >= 0 ? 1 : -1;
    car.localVelocity.x -= speedSign * (data.rollingResistance || 6) * dt;

    if (control.handbrake) {
        car.localVelocity.x = moveTowards(car.localVelocity.x, 0, data.handbrakeForce * dt * 0.8);
    }

    car.localVelocity.x = Phaser.Math.Clamp(car.localVelocity.x, -data.maxReverseSpeed, data.topSpeed);

    const vx = car.localVelocity.x;
    const vy = car.localVelocity.y;
    const omega = car.angularVelocity || 0;

    const gripScale = surfaceGrip;
    const cf = data.cornerStiffnessFront * gripScale;
    let cr = data.cornerStiffnessRear * gripScale;

    if (control.handbrake) {
        cr *= 0.25;
        const driftDir = signOrDefault(control.steer || car.angularVelocity || car.lastDriftDir);
        car.lastDriftDir = driftDir;
        const slipEnergy = Math.min(Math.abs(vx), data.handbrakeForce) * 0.025;
        car.localVelocity.y += driftDir * slipEnergy;
        car.angularVelocity += driftDir * 1.4 * dt;
    } else if (control.steer !== 0) {
        car.lastDriftDir = signOrDefault(control.steer);
    }

    const speed = Math.max(4, Math.abs(vx));
    const alphaFront = Math.atan2(vy + omega * data.cgToFront, speed) - (car.currentSteer || 0);
    const alphaRear = Math.atan2(vy - omega * data.cgToRear, speed);

    let frontForce = -cf * alphaFront;
    let rearForce = -cr * alphaRear;

    const maxLat = data.maxLateralForce;
    frontForce = Phaser.Math.Clamp(frontForce, -maxLat, maxLat);
    rearForce = Phaser.Math.Clamp(rearForce, -maxLat, maxLat);

    const totalLateral = frontForce + rearForce;

    car.localVelocity.y += (totalLateral / data.mass) * dt;
    car.localVelocity.y -= car.localVelocity.y * (data.lateralDamping || 4) * dt;

    const yawTorque = data.cgToFront * frontForce - data.cgToRear * rearForce;
    car.angularVelocity = (car.angularVelocity || 0) + (yawTorque / data.inertia) * dt;
    car.angularVelocity *= 1 - Phaser.Math.Clamp((data.angularDamping || 3) * dt, 0, 0.92);

    if (Math.abs(car.localVelocity.x) < 1) car.localVelocity.x = 0;
    if (Math.abs(car.localVelocity.y) < 0.55) car.localVelocity.y = 0;
    if (Math.abs(car.angularVelocity) < 0.004) car.angularVelocity = 0;

    sprite.rotation += car.angularVelocity * dt;

    const sin = Math.sin(sprite.rotation);
    const cos = Math.cos(sprite.rotation);

    const worldVx = cos * car.localVelocity.x - sin * car.localVelocity.y;
    const worldVy = sin * car.localVelocity.x + cos * car.localVelocity.y;

    sprite.body.setVelocity(worldVx, worldVy);
    sprite.body.setAngularVelocity(0);

    car.speed = Math.sqrt(worldVx * worldVx + worldVy * worldVy);
    car.carSpeedMph = Math.round(car.speed / PIXELS_PER_MPH);
};