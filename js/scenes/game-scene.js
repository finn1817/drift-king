// js/scenes/game-scene.js
import { CAR_TYPES } from '../car-presets.js';
import { TRACKS } from '../track-config.js';
import { PIXELS_PER_MPH } from '../utils.js';
import { ensureGameTextures } from '../texture-factory.js';
import { spawnCar } from '../vehicle-factory.js';
import { applyCarPhysics } from '../vehicle-physics.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.trackId = data.track || 'lot';
        this.carId = data.car || 'drift';
        this.trackConfig = TRACKS[this.trackId] || TRACKS.lot;
        this.carData = CAR_TYPES[this.carId] || CAR_TYPES.drift;

        this.worldWidth = this.trackConfig.worldWidth;
        this.worldHeight = this.trackConfig.worldHeight;

        this.playerCar = null;
        this.aiCars = [];
        this.cars = [];
        this.racers = [];
        this.finishOrder = [];
        this.isRaceTrack = this.trackConfig.type === 'race';
        this.raceState = this.isRaceTrack ? 'grid' : 'free';
        this.surfaceGrip = 1;
        this.isRaining = false;
        this.lastWallHitTime = 0;

        this.hud = {
            speed: document.getElementById('speedDisplay'),
            carName: document.getElementById('carType'),
            trackName: document.getElementById('trackName'),
            weather: document.getElementById('weather'),
            healthContainer: document.getElementById('healthContainer'),
            health: document.getElementById('healthDisplay'),
            lapContainer: document.getElementById('lapContainer'),
            lap: document.getElementById('lapDisplay'),
            positionContainer: document.getElementById('positionContainer'),
            position: document.getElementById('positionDisplay')
        };
    }

    create() {
        ensureGameTextures(this);
        this.createWorld();
        this.createCars();
        this.setupCamera();
        this.setupControls();
        this.setupCollisions();
        this.createUIOverlays();

        this.updateHUD(true);

        if (this.isRaceTrack) {
            this.startRaceCountdown();
        }
    }

    createWorld() {
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.trackWalls = this.physics.add.staticGroup();

        if (this.trackId === 'lot') {
            this.createLotWorld();
        } else if (this.trackId === 'daytona') {
            this.createDaytonaWorld();
        }
    }

    createLotWorld() {
        this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x303030).setDepth(-10);

        const graphics = this.add.graphics({ depth: -8 });
        graphics.lineStyle(2, 0xffff99, 0.28);

        for (let x = 200; x < this.worldWidth; x += 160) {
            graphics.lineBetween(x, 140, x, this.worldHeight - 140);
        }
        for (let y = 200; y < this.worldHeight; y += 120) {
            graphics.lineBetween(140, y, this.worldWidth - 140, y);
        }

        const boundaryGraphics = this.add.graphics({ depth: -9 });
        boundaryGraphics.lineStyle(16, 0x1f1f1f, 0.9);
        boundaryGraphics.strokeRect(60, 60, this.worldWidth - 120, this.worldHeight - 120);
    }

    createDaytonaWorld() {
        const {
            centerX,
            centerY,
            outerRadiusX,
            outerRadiusY,
            innerRadiusX,
            innerRadiusY
        } = this.trackConfig;

        this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x173018).setDepth(-12);

        const g = this.add.graphics({ depth: -10 });

        g.fillStyle(0x09121c, 1);
        g.fillEllipse(centerX, centerY, outerRadiusX * 2 + 300, outerRadiusY * 2 + 300);

        g.fillStyle(0x1e1e1e, 1);
        g.fillEllipse(centerX, centerY, outerRadiusX * 2, outerRadiusY * 2);

        g.fillStyle(0x142211, 1);
        g.fillEllipse(centerX, centerY, innerRadiusX * 2, innerRadiusY * 2);

        g.lineStyle(10, 0xffffff, 0.55);
        g.strokeEllipse(centerX, centerY, outerRadiusX * 2 - 120, outerRadiusY * 2 - 120);

        g.lineStyle(6, 0xffd700, 0.55);
        g.strokeEllipse(centerX, centerY, innerRadiusX * 2 + 40, innerRadiusY * 2 + 40);

        const startLine = this.add.rectangle(centerX, centerY + this.trackConfig.midRadiusY - 60, 280, 8, 0xffffff)
            .setDepth(-6)
            .setAngle(0);
        startLine.setAlpha(0.85);

        this.createOvalBarrier(this.trackWalls, centerX, centerY, innerRadiusX + 40, innerRadiusY + 40, 96, 80, 90);
        this.createOvalBarrier(this.trackWalls, centerX, centerY, outerRadiusX + 120, outerRadiusY + 120, 96, 90, 110, true);
    }

    createOvalBarrier(group, centerX, centerY, radiusX, radiusY, segments, lengthScalar = 90, thickness = 70, outer = false) {
        const step = Math.PI * 2 / segments;
        for (let i = 0; i < segments; i++) {
            const angle = i * step;
            const x1 = centerX + Math.cos(angle) * radiusX;
            const y1 = centerY + Math.sin(angle) * radiusY;
            const x2 = centerX + Math.cos(angle + step) * radiusX;
            const y2 = centerY + Math.sin(angle + step) * radiusY;
            const segLength = Phaser.Math.Distance.Between(x1, y1, x2, y2) * 1.08 + lengthScalar;

            const wall = group.create((x1 + x2) / 2, (y1 + y2) / 2, 'wallTexture');
            wall.setOrigin(0.5, 0.5);
            wall.setRotation(angle + Math.PI / 2);
            wall.setDisplaySize(segLength, thickness);
            wall.refreshBody();
            wall.setVisible(false);
            wall.body.checkCollision.none = false;
            wall.body.immovable = true;

            if (outer) {
                wall.body.setOffset(0, 0);
            }
        }
    }

    createCars() {
        const startPositions = this.trackConfig.startPositions || [{ x: this.worldWidth / 2, y: this.worldHeight / 2, angle: -Math.PI / 2 }];
        const playerSpawn = startPositions[0];

        this.playerCar = spawnCar(this, {
            carId: this.carId,
            x: playerSpawn.x,
            y: playerSpawn.y,
            angle: playerSpawn.angle,
            isAI: false,
            isRaceTrack: this.isRaceTrack
        });
        this.cars.push(this.playerCar);

        if (this.isRaceTrack) {
            const raceCfg = this.trackConfig.race;
            this.playerCar.prevWaypoint = raceCfg.waypoints.length - 1;

            for (let i = 0; i < raceCfg.aiCount; i++) {
                const spawnIndex = Math.min(i + 1, startPositions.length - 1);
                const spawn = startPositions[spawnIndex] || playerSpawn;
                const aiIds = Object.keys(CAR_TYPES).filter((id) => id !== this.carId);
                const aiCarId = aiIds[i % aiIds.length];
                const aiCar = spawnCar(this, {
                    carId: aiCarId,
                    x: spawn.x,
                    y: spawn.y,
                    angle: spawn.angle,
                    isAI: true,
                    name: `AI #${i + 1}`,
                    isRaceTrack: true
                });
                aiCar.prevWaypoint = raceCfg.waypoints.length - 1;
                this.aiCars.push(aiCar);
                this.cars.push(aiCar);
            }
            this.racers = [this.playerCar, ...this.aiCars];
        } else {
            this.racers = [this.playerCar];
        }
    }

    setupCamera() {
        const zoom = this.trackConfig.cameraZoom || 0.8;
        this.cameras.main.startFollow(this.playerCar.sprite, true, 0.12, 0.12);
        this.cameras.main.setZoom(zoom);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBackgroundColor(this.trackId === 'daytona' ? 0x08131d : 0x161616);
    }

    setupControls() {
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            handbrake: Phaser.Input.Keyboard.KeyCodes.SPACE,
            reset: Phaser.Input.Keyboard.KeyCodes.R,
            weather: Phaser.Input.Keyboard.KeyCodes.T,
            menu: Phaser.Input.Keyboard.KeyCodes.ESC
        });
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    setupCollisions() {
        if (this.trackWalls) {
            this.cars.forEach((car) => {
                this.physics.add.collider(car.sprite, this.trackWalls, this.handleCarWallCollision, null, this);
            });
        }

        this.aiCars.forEach((aiCar) => {
            this.physics.add.collider(this.playerCar.sprite, aiCar.sprite, this.handleCarVsCarCollision, null, this);
        });

        for (let i = 0; i < this.aiCars.length; i++) {
            for (let j = i + 1; j < this.aiCars.length; j++) {
                this.physics.add.collider(this.aiCars[i].sprite, this.aiCars[j].sprite, this.handleCarVsCarCollision, null, this);
            }
        }
    }

    createUIOverlays() {
        this.countdownText = this.add.text(640, 180, '', {
            fontFamily: 'Arial Black',
            fontSize: '96px',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false);

        this.raceMessageText = this.add.text(640, 260, '', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setVisible(false);

        // Direction arrow (HUD) to show where to drive in race tracks
        this.directionArrow = this.add.image(640, 90, 'dirArrow')
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(this.isRaceTrack);

        if (this.isRaceTrack) {
            this.hud.healthContainer.classList.remove('hidden');
            this.hud.lapContainer.classList.remove('hidden');
            this.hud.positionContainer.classList.remove('hidden');
        } else {
            this.hud.healthContainer.classList.add('hidden');
            this.hud.lapContainer.classList.add('hidden');
            this.hud.positionContainer.classList.add('hidden');
        }
    }

    startRaceCountdown() {
        this.raceState = 'countdown';
        this.disableInput = true;
        let count = 3;

        this.countdownText.setText(count.toString()).setVisible(true);

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                count--;
                if (count > 0) {
                    this.countdownText.setText(count.toString());
                } else if (count === 0) {
                    this.countdownText.setText('GO!');
                    this.raceState = 'running';
                    this.disableInput = false;
                    // Grace period: player cannot take damage for the first 5 seconds
                    if (this.playerCar) {
                        this.playerCar.invulnerableUntil = this.time.now + 5000;
                    }
                    this.time.delayedCall(700, () => this.countdownText.setVisible(false));
                }
            }
        });
    }

    getPlayerControls() {
        const up = this.keys.up.isDown || this.cursors.up.isDown;
        const down = this.keys.down.isDown || this.cursors.down.isDown;
        const left = this.keys.left.isDown || this.cursors.left.isDown;
        const right = this.keys.right.isDown || this.cursors.right.isDown;
        const handbrake = this.keys.handbrake.isDown;

        const control = {
            throttle: 0,
            brake: 0,
            steer: 0,
            reverse: false,
            handbrake
        };

        if (!this.playerCar.retired) {
            if (up) control.throttle = 1;
            if (down) {
                if (Math.abs(this.playerCar.localVelocity?.x || 0) > 120) {
                    control.brake = 1;
                } else {
                    control.reverse = true;
                }
            }
        }

        if (left) control.steer -= 1;
        if (right) control.steer += 1;
        control.steer = Phaser.Math.Clamp(control.steer, -1, 1);

        return control;
    }

    getAIControl(car) {
        const raceCfg = this.trackConfig.race;
        const waypoints = raceCfg.waypoints;
        const waypoint = waypoints[car.nextWaypoint];
        const sprite = car.sprite;

        const targetAngle = Phaser.Math.Angle.Between(sprite.x, sprite.y, waypoint.x, waypoint.y);
        let angleDiff = Phaser.Math.Angle.Wrap(targetAngle - sprite.rotation);
        angleDiff = Phaser.Math.Clamp(angleDiff, -Math.PI, Math.PI);

        const steer = Phaser.Math.Clamp(angleDiff / (Math.PI / 2), -1, 1);

        const speedMph = car.carSpeedMph || 0;
        const targetTop = Math.min(car.data.topSpeedMph - 2, 78);
        let throttle = 1;

        const angleSeverity = Math.abs(angleDiff);
        if (angleSeverity > 0.6) throttle = 0.7;
        if (angleSeverity > 0.9) throttle = 0.45;
        if (angleSeverity > 1.2) throttle = 0.2;

        if (speedMph > targetTop + 3) throttle = Math.min(throttle, 0.3);
        if (speedMph > targetTop + 6) throttle = 0;

        let brake = 0;
        if (speedMph > targetTop + 7) brake = 0.45;
        if (speedMph > targetTop + 12) brake = 0.8;

        const playerProgress = this.playerCar.raceProgress || 0;
        if (!car.finished && !this.playerCar.finished) {
            if (car.raceProgress < playerProgress - 0.12) {
                throttle = Math.min(1.05, throttle + 0.3);
            } else if (car.raceProgress > playerProgress + 0.18) {
                throttle = Math.max(0.55, throttle - 0.35);
            }
        }

        return {
            throttle: Phaser.Math.Clamp(throttle, 0, 1.1),
            brake,
            steer,
            reverse: false,
            handbrake: false
        };
    }

    constrainCarToTrack(car) {
        if (!car || this.trackId !== 'daytona') return;
        const cfg = this.trackConfig;
        const sprite = car.sprite;
        const dx = sprite.x - cfg.centerX;
        const dy = sprite.y - cfg.centerY;

        const innerA = cfg.innerRadiusX + 60;
        const innerB = cfg.innerRadiusY + 60;
        const innerValue = (dx * dx) / (innerA * innerA) + (dy * dy) / (innerB * innerB);

        if (innerValue < 1) {
            const factor = 1 / Math.sqrt(innerValue);
            const targetX = cfg.centerX + dx * factor * 1.015;
            const targetY = cfg.centerY + dy * factor * 1.015;

            sprite.setPosition(targetX, targetY);
            sprite.body.position.set(targetX - sprite.body.halfWidth, targetY - sprite.body.halfHeight);
            sprite.body.velocity.set(sprite.body.velocity.x * 0.6, sprite.body.velocity.y * -0.1);

            car.localVelocity.x *= 0.6;
            car.localVelocity.y *= -0.4;
            car.angularVelocity *= 0.25;

            this.registerBoundaryHit(car, 'inner');
        }

        const outerA = cfg.outerRadiusX - 90;
        const outerB = cfg.outerRadiusY - 90;
        const outerValue = (dx * dx) / (outerA * outerA) + (dy * dy) / (outerB * outerB);

        if (outerValue > 1) {
            const factor = 1 / Math.sqrt(outerValue);
            const targetX = cfg.centerX + dx * factor * 0.985;
            const targetY = cfg.centerY + dy * factor * 0.985;

            sprite.setPosition(targetX, targetY);
            sprite.body.position.set(targetX - sprite.body.halfWidth, targetY - sprite.body.halfHeight);
            sprite.body.velocity.set(sprite.body.velocity.x * -0.2, sprite.body.velocity.y * 0.4);

            car.localVelocity.x *= -0.3;
            car.localVelocity.y *= 0.25;
            car.angularVelocity *= 0.35;

            this.registerBoundaryHit(car, 'outer');
        }
    }

    registerBoundaryHit(car, type) {
        if (!this.isRaceTrack) return;
        const now = this.time.now;
        if (now - car.lastBoundaryHit > 500) {
            const dmg = type === 'outer' ? 14 : 8;
            this.applyDamage(car, dmg, 'wall');
            car.lastBoundaryHit = now;
            if (car === this.playerCar) {
                this.showRaceMessage(type === 'outer' ? 'Outside wall! Easy on the throttle.' : 'Stay off the apron!', 1100);
            }
        }
    }

    updateWaypointProgress(car) {
        if (!this.isRaceTrack || car.retired) return;

        const raceCfg = this.trackConfig.race;
        const waypoints = raceCfg.waypoints;
        const total = waypoints.length;

        if (car.finished) {
            car.raceProgress = raceCfg.laps + this.finishOrder.indexOf(car) + 1;
            return;
        }

        const waypoint = waypoints[car.nextWaypoint];
        const distance = Phaser.Math.Distance.Between(car.sprite.x, car.sprite.y, waypoint.x, waypoint.y);

        if (distance < raceCfg.waypointRadius) {
            car.prevWaypoint = car.nextWaypoint;
            car.nextWaypoint = (car.nextWaypoint + 1) % total;
            if (car.nextWaypoint === 0) {
                car.lap += 1;
            }
        }

        const prevPoint = waypoints[car.prevWaypoint];
        const nextPoint = waypoints[car.nextWaypoint];
        const segmentLength = Phaser.Math.Distance.Between(prevPoint.x, prevPoint.y, nextPoint.x, nextPoint.y) || 1;
        const distToNext = Phaser.Math.Distance.Between(car.sprite.x, car.sprite.y, nextPoint.x, nextPoint.y);
        const alongSegment = 1 - Phaser.Math.Clamp(distToNext / segmentLength, 0, 1);

        const lapBase = (car.lap || 1) - 1;
        const segmentProgress = (car.prevWaypoint + alongSegment) / total;
        car.raceProgress = lapBase + segmentProgress;

        if (car.lap > raceCfg.laps && !car.finished) {
            car.finished = true;
            car.raceProgress = raceCfg.laps + (this.finishOrder.length + 1) / 10;
            this.finishOrder.push(car);
            if (car === this.playerCar) {
                this.onPlayerFinished();
            } else {
                this.showRaceMessage(`${car.name} crossed the finish!`, 2000);
            }
        }
    }

    updateRacePositions() {
        if (!this.isRaceTrack) return;
        const racers = [...this.racers];
        racers.sort((a, b) => (b.raceProgress || 0) - (a.raceProgress || 0));
        racers.forEach((car, index) => {
            car.position = index + 1;
        });

        if (this.playerCar) {
            const total = this.racers.length;
            const pos = this.playerCar.position || total;
            this.hud.position.textContent = `${pos} / ${total}`;

            const laps = this.trackConfig.race.laps;
            if (this.playerCar.finished) {
                this.hud.lap.textContent = `Finished`;
            } else {
                const currentLap = Phaser.Math.Clamp(this.playerCar.lap, 1, laps);
                this.hud.lap.textContent = `${currentLap} / ${laps}`;
            }
        }
    }

    handleCarWallCollision(sprite) {
        const car = sprite.getData('carRef');
        if (!car) return;

        const impactSpeed = car.speed || sprite.body.speed;
        if (impactSpeed < 70) return;

        car.localVelocity.x *= 0.55;
        car.localVelocity.y *= -0.35;
        car.angularVelocity *= -0.32;

        if (this.isRaceTrack) {
            const dmg = Phaser.Math.Clamp(Math.round((impactSpeed / (car.data.topSpeed || 1)) * 18), 6, 24);
            this.applyDamage(car, dmg, 'wall');
        }
    }

    handleCarVsCarCollision(spriteA, spriteB) {
        const carA = spriteA.getData('carRef');
        const carB = spriteB.getData('carRef');
        if (!carA || !carB) return;

        const dvx = spriteA.body.velocity.x - spriteB.body.velocity.x;
        const dvy = spriteA.body.velocity.y - spriteB.body.velocity.y;
        const relativeSpeed = Math.sqrt(dvx * dvx + dvy * dvy);

        if (relativeSpeed < 40) return;

        carA.localVelocity.x *= 0.82;
        carB.localVelocity.x *= 0.82;
        carA.localVelocity.y += (Math.random() - 0.5) * 30;
        carB.localVelocity.y += (Math.random() - 0.5) * 30;

        if (this.isRaceTrack) {
            const dmg = Phaser.Math.Clamp(Math.round((relativeSpeed / carA.data.topSpeed) * 20), 5, 26);
            this.applyDamage(carA, dmg, 'collision');
            this.applyDamage(carB, dmg, 'collision');
        }
    }

    applyDamage(car, amount, source = '') {
        if (!car || car.retired || !this.isRaceTrack) return;

        // Skip damage during player grace period at race start
        if (car.invulnerableUntil && this.time.now < car.invulnerableUntil) {
            return;
        }

        car.health = Math.max(0, car.health - amount);
        car.localVelocity.x *= 0.78;
        car.localVelocity.y *= 0.55;
        car.angularVelocity *= 0.45;

        if (car === this.playerCar) {
            if (source === 'collision') {
                this.showRaceMessage('Contact! Keep it clean.', 1200);
            } else if (source === 'wall') {
                this.showRaceMessage('Impact! Car health dropping.', 1200);
            }
        }

        if (car.health <= 0 && !car.retired) {
            car.retired = true;
            car.localVelocity.set(0, 0);
            car.angularVelocity = 0;
            car.sprite.body.setVelocity(0, 0);
            car.sprite.setTint(0x333333);
            this.showRaceMessage(`${car.name} is out!`, 1800);

            if (car === this.playerCar) {
                this.raceState = 'finished';
                this.disableInput = true;
            }
        }
    }

    onPlayerFinished() {
        if (!this.isRaceTrack) return;
        if (this.raceState !== 'finished') {
            this.raceState = 'finished';
            this.disableInput = true;
            const placement = this.playerCar.position || this.racers.length;
            const suffix = placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th';
            this.showRaceMessage(`Race Complete! You finished ${placement}${suffix}.`, 4000);
        }
    }

    showRaceMessage(message, duration = 1800) {
        this.raceMessageText.setText(message);
        this.raceMessageText.setVisible(true);

        this.time.removeEvent(this.messageTimer);
        this.messageTimer = this.time.delayedCall(duration, () => {
            this.raceMessageText.setVisible(false);
        });
    }

    resetPlayerCar() {
        const spawn = this.trackConfig.startPositions[0] || { x: this.worldWidth / 2, y: this.worldHeight / 2, angle: -Math.PI / 2 };
        const car = this.playerCar;

        car.sprite.setPosition(spawn.x, spawn.y);
        car.sprite.body.position.set(spawn.x - car.sprite.body.halfWidth, spawn.y - car.sprite.body.halfHeight);
        car.sprite.setRotation(spawn.angle);
        car.sprite.body.setVelocity(0, 0);

        car.localVelocity.set(0, 0);
        car.angularVelocity = 0;
        car.currentSteer = 0;
        car.speed = 0;
        car.carSpeedMph = 0;
        car.lastDriftDir = 1;

        if (this.isRaceTrack) {
            car.health = car.maxHealth;
            car.lap = 1;
            car.prevWaypoint = this.trackConfig.race.waypoints.length - 1;
            car.nextWaypoint = 0;
            car.raceProgress = 0;
            car.finished = false;
            car.retired = false;
            car.sprite.clearTint();
            car.sprite.body.enable = true;
            this.finishOrder = [];
            this.aiCars.forEach((ai) => {
                const aiSpawn = this.trackConfig.startPositions[1] || spawn;
                ai.sprite.setPosition(aiSpawn.x, aiSpawn.y);
                ai.sprite.body.position.set(aiSpawn.x - ai.sprite.body.halfWidth, aiSpawn.y - ai.sprite.body.halfHeight);
                ai.sprite.setRotation(aiSpawn.angle);
                ai.sprite.body.setVelocity(0, 0);
                ai.localVelocity.set(0, 0);
                ai.angularVelocity = 0;
                ai.currentSteer = 0;
                ai.health = ai.maxHealth;
                ai.lap = 1;
                ai.prevWaypoint = this.trackConfig.race.waypoints.length - 1;
                ai.nextWaypoint = 0;
                ai.finished = false;
                ai.retired = false;
                ai.sprite.clearTint();
            });
            this.raceState = 'countdown';
            this.startRaceCountdown();
            this.showRaceMessage('Reset complete. Countdown restarting.', 1800);
        } else {
            this.showRaceMessage('Back to center!', 1200);
        }
    }

    toggleWeather() {
        this.isRaining = !this.isRaining;
        if (this.trackConfig.allowRain) {
            const weatherText = this.isRaining ? 'Rain 🌧️' : 'Clear ☀️';
            this.hud.weather.textContent = weatherText;
            this.surfaceGrip = this.isRaining ? 0.74 : 1.0;

            if (this.isRaining) {
                this.cameras.main.setBackgroundColor(0x1a2636);
            } else {
                this.cameras.main.setBackgroundColor(this.trackId === 'daytona' ? 0x08131d : 0x161616);
            }
        }
    }

    update(_, delta) {
        if (!this.playerCar) return;

        const dt = delta / 1000;

        if (this.keys.menu.isDown) {
            this.scene.start('MenuScene');
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.weather) && this.trackConfig.allowRain) {
            this.toggleWeather();
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
            this.resetPlayerCar();
        }

        const playerControl = this.getPlayerControls();
        if (this.isRaceTrack && this.raceState !== 'running') {
            playerControl.throttle = 0;
            playerControl.reverse = false;
            playerControl.brake = 1;
            playerControl.handbrake = false;
        }

        applyCarPhysics(this.playerCar, playerControl, dt, this.surfaceGrip);
        this.constrainCarToTrack(this.playerCar);
        this.updateWaypointProgress(this.playerCar);

        this.aiCars.forEach((ai) => {
            const control = this.getAIControl(ai);
            if (this.raceState !== 'running') {
                control.throttle = 0;
                control.brake = 1;
            }
            applyCarPhysics(ai, control, dt, this.surfaceGrip);
            this.constrainCarToTrack(ai);
            this.updateWaypointProgress(ai);
        });

        if (this.isRaceTrack) {
            this.updateRacePositions();
        }

        this.updateHUD();

        // Update driving direction arrow (points from player's heading to next waypoint)
        if (this.isRaceTrack && this.directionArrow && this.playerCar && !this.playerCar.finished) {
            const raceCfg = this.trackConfig.race;
            const wp = raceCfg.waypoints[this.playerCar.nextWaypoint];
            if (wp) {
                const sprite = this.playerCar.sprite;
                const targetAngle = Phaser.Math.Angle.Between(sprite.x, sprite.y, wp.x, wp.y);
                const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - sprite.rotation);
                this.directionArrow.setVisible(true);
                this.directionArrow.rotation = angleDiff; // Up (0) means aligned
            }
        } else if (this.directionArrow) {
            this.directionArrow.setVisible(false);
        }
    }

    updateHUD(force = false) {
        if (!this.playerCar) return;

        this.hud.speed.textContent = this.playerCar.carSpeedMph;
        this.hud.carName.textContent = this.playerCar.data.name;
        this.hud.trackName.textContent = this.trackConfig.name;

        if (this.isRaceTrack || force) {
            const healthRatio = Math.max(0, Math.round((this.playerCar.health / this.playerCar.maxHealth) * 100));
            this.hud.health.textContent = this.playerCar.retired ? '0%' : `${healthRatio}%`;
        } else {
            this.hud.health.textContent = '∞';
        }

        if (!this.isRaceTrack) {
            this.hud.lap.textContent = '--';
            this.hud.position.textContent = '--';
        }
    }
}