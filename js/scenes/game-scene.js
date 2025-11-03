// js/scenes/game-scene.js
import { CAR_TYPES, getCarScheme } from '../car-presets.js';
import { TRACKS } from '../track-config.js';
import { PIXELS_PER_MPH, clamp, randRange } from '../utils.js';
import { ensureGameTextures } from '../texture-factory.js';
import { spawnCar } from '../vehicle-factory.js';
import { applyCarPhysics } from '../vehicle-physics.js';
import { AI_PROFILES } from '../ai-profiles.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.trackId = data.track || 'lot';
        this.carId = data.car || 'drift';
        this.schemeId = data.schemeId || CAR_TYPES[this.carId].schemes[0].id;
        this.trackConfig = TRACKS[this.trackId] || TRACKS.lot;
        this.carData = CAR_TYPES[this.carId] || CAR_TYPES.drift;
        this.customPhysics = data.customPhysics || {};
        this.aiDifficulty = data.aiDifficulty || 'medium';
        this.aiProfile = AI_PROFILES[this.aiDifficulty] || AI_PROFILES.medium;
        this.desiredAICount = this.trackConfig.type === 'race'
            ? Math.min(data.aiCount ?? 0, this.trackConfig.maxAI ?? 0)
            : 0;

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

        this.initializeRaceTelemetry();

    // Track colliders so we can toggle ghosting (disable car-vs-car collisions briefly)
    this._colliders = { carVsCar: [], carVsWalls: [] };

        this.hud = {
            speed: document.getElementById('speedDisplay'),
            carName: document.getElementById('carType'),
            trackName: document.getElementById('trackName'),
            weather: document.getElementById('weather'),
            healthContainer: document.getElementById('healthContainer'),
            health: document.getElementById('healthDisplay'),
            healthBar: document.getElementById('healthBarFill'),
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
        this.createMinimap();

        this.updateHUD(true);

        if (this.isRaceTrack) {
            this.startRaceCountdown();
        }
    }

    initializeRaceTelemetry() {
        this.raceTimer = 0;
        this.playerLapStartTime = 0;
        this.playerLapHistory = [];
        this.playerLapCounter = 1;
    }

    createWorld() {
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.trackWalls = this.physics.add.staticGroup();
        this.trackArrows = this.add.group();

        if (this.trackId === 'lot') {
            this.createLotWorld();
        } else if (this.trackId === 'daytona') {
            this.createDaytonaWorld();
        }
    }

    createLotWorld() {
        this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x303030).setDepth(-12);

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

        this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x173018).setDepth(-14);

        const g = this.add.graphics({ depth: -12 });

        g.fillStyle(0x09121c, 1);
        g.fillEllipse(centerX, centerY, outerRadiusX * 2 + 360, outerRadiusY * 2 + 360);

        g.fillStyle(0x1e1e1e, 1);
        g.fillEllipse(centerX, centerY, outerRadiusX * 2, outerRadiusY * 2);

        g.fillStyle(0x142211, 1);
        g.fillEllipse(centerX, centerY, innerRadiusX * 2, innerRadiusY * 2);

        g.lineStyle(10, 0xffffff, 0.55);
        g.strokeEllipse(centerX, centerY, outerRadiusX * 2 - 180, outerRadiusY * 2 - 180);

        g.lineStyle(6, 0xffd700, 0.55);
        g.strokeEllipse(centerX, centerY, innerRadiusX * 2 + 80, innerRadiusY * 2 + 80);

        const startLine = this.add.rectangle(centerX, centerY + this.trackConfig.midRadiusY - 160, 320, 10, 0xffffff)
            .setDepth(-6)
            .setAngle(0);
        startLine.setAlpha(0.9);

        this.createOvalBarrier(this.trackWalls, centerX, centerY, innerRadiusX + 40, innerRadiusY + 40, 120, 86, 120);
        this.createOvalBarrier(this.trackWalls, centerX, centerY, outerRadiusX + 160, outerRadiusY + 160, 120, 96, 150, true);

        this.placeTrackArrows();
    }

    placeTrackArrows() {
        if (!this.trackConfig.race) return;
        const waypoints = this.trackConfig.race.waypoints;
        const step = this.trackConfig.arrowStep ?? 6;
        for (let i = 0; i < waypoints.length; i += step) {
            const current = waypoints[i];
            const next = waypoints[(i + step) % waypoints.length];
            const angle = Phaser.Math.Angle.Between(current.x, current.y, next.x, next.y);
            const arrow = this.add.image(current.x, current.y, 'trackArrow');
            arrow.setRotation(angle);
            arrow.setDepth(-5);
            arrow.setAlpha(0.45);
            arrow.setScale(0.8);
            this.trackArrows.add(arrow);
        }
    }

    createOvalBarrier(group, centerX, centerY, radiusX, radiusY, segments, lengthScalar = 90, thickness = 80, outer = false) {
        const step = Math.PI * 2 / segments;
        for (let i = 0; i < segments; i++) {
            const angle = i * step;
            const x1 = centerX + Math.cos(angle) * radiusX;
            const y1 = centerY + Math.sin(angle) * radiusY;
            const x2 = centerX + Math.cos(angle + step) * radiusX;
            const y2 = centerY + Math.sin(angle + step) * radiusY;
            const segLength = Phaser.Math.Distance.Between(x1, y1, x2, y2) * 1.05 + lengthScalar;

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
            schemeId: this.schemeId,
            x: playerSpawn.x,
            y: playerSpawn.y,
            angle: playerSpawn.angle,
            isAI: false,
            isRaceTrack: this.isRaceTrack,
            customPhysics: this.customPhysics
        });

        this.cars.push(this.playerCar);
        this.hud.carName.textContent = getCarScheme(this.carId, this.schemeId).name;

        if (this.isRaceTrack) {
            const raceCfg = this.trackConfig.race;
            this.playerCar.prevWaypoint = raceCfg.waypoints.length - 1;

            const aiCarPool = Object.keys(CAR_TYPES).filter((id) => id !== this.carId);
            const totalAI = this.desiredAICount;

            for (let i = 0; i < totalAI; i++) {
                const spawnIndex = Math.min(i + 1, startPositions.length - 1);
                const spawn = startPositions[spawnIndex] || {
                    x: playerSpawn.x + (i + 1) * 80,
                    y: playerSpawn.y + 40,
                    angle: playerSpawn.angle
                };

                let aiCarId = aiCarPool[i % aiCarPool.length];
                if (this.aiDifficulty === 'hard') {
                    aiCarId = this.playerCar.id;
                }

                const carSchemes = CAR_TYPES[aiCarId].schemes;
                let schemeChoice = carSchemes[0].id;
                if (aiCarId === this.playerCar.id) {
                    const alternatives = carSchemes.filter((scheme) => scheme.id !== this.playerCar.schemeId);
                    if (alternatives.length > 0) {
                        schemeChoice = alternatives[i % alternatives.length].id;
                    } else {
                        schemeChoice = carSchemes[0].id;
                    }
                } else {
                    schemeChoice = carSchemes[i % carSchemes.length].id;
                }

                const aiCar = spawnCar(this, {
                    carId: aiCarId,
                    schemeId: schemeChoice,
                    x: spawn.x,
                    y: spawn.y,
                    angle: spawn.angle,
                    isAI: true,
                    name: `AI (${DIFFICULTY_LABELS[this.aiDifficulty]}) #${i + 1}`,
                    isRaceTrack: true
                });
                aiCar.prevWaypoint = raceCfg.waypoints.length - 1;
                aiCar.aiProfile = this.aiProfile;
                aiCar.aiMeta = {
                    throttle: 0,
                    brake: 0,
                    steer: 0,
                    reactionDelay: randRange(0.1, 0.35) * this.aiProfile.reaction,
                    aggression: randRange(0.85, 1.15) * this.aiProfile.aggression,
                    targetSpeedBoost: randRange(-2, 2) + this.aiProfile.speedBonus
                };
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
                const c = this.physics.add.collider(car.sprite, this.trackWalls, this.handleCarWallCollision, null, this);
                this._colliders.carVsWalls.push(c);
            });
        }

        this.aiCars.forEach((aiCar) => {
            const c = this.physics.add.collider(this.playerCar.sprite, aiCar.sprite, this.handleCarVsCarCollision, null, this);
            this._colliders.carVsCar.push(c);
        });

        for (let i = 0; i < this.aiCars.length; i++) {
            for (let j = i + 1; j < this.aiCars.length; j++) {
                const c = this.physics.add.collider(this.aiCars[i].sprite, this.aiCars[j].sprite, this.handleCarVsCarCollision, null, this);
                this._colliders.carVsCar.push(c);
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
        this.initializeRaceTelemetry();

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
                    if (this.playerCar) {
                        // Extended invulnerability: 12 seconds of no damage
                        this.playerCar.invulnerableUntil = this.time.now + 12000;
                    }
                    // Extended ghosting: disable car-vs-car collisions for 8 seconds to avoid turn 1 pileups
                    this.setCarVsCarCollidersActive(false);
                    this.time.delayedCall(8000, () => this.setCarVsCarCollidersActive(true));
                    
                    // AI starts slower and accelerates gradually
                    this.aiCars.forEach(ai => {
                        ai.aiStartThrottle = 0.2;
                        ai.aiStartTime = this.time.now;
                    });
                    
                    // Show protection message
                    this.time.delayedCall(800, () => {
                        this.showRaceMessage('Protected: 12s invulnerable, 8s ghost mode!', 3500);
                    });
                    
                    this.time.delayedCall(700, () => this.countdownText.setVisible(false));
                }
            }
        });
    }

    setCarVsCarCollidersActive(active) {
        (this._colliders.carVsCar || []).forEach(c => c.active = active);
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

        const profile = car.aiProfile || this.aiProfile;
        const meta = car.aiMeta;

        const steerResponsiveness = profile.steerResponsiveness;
        const steerTarget = Phaser.Math.Clamp(angleDiff / (Math.PI / (2 * steerResponsiveness)), -1, 1);
        meta.steer = Phaser.Math.Linear(meta.steer || 0, steerTarget, 0.18);

    const speedMph = car.carSpeedMph || 0;
    const targetTop = Math.min(car.data.topSpeedMph + (meta.targetSpeedBoost || 0), 88);
    let throttle = 1;
    
    // Progressive AI start: begin very slow and ramp up over 10 seconds
    if (car.aiStartTime) {
        const timeSinceStart = this.time.now - car.aiStartTime;
        if (timeSinceStart < 10000) {
            const startProgress = timeSinceStart / 10000;
            const startThrottle = Phaser.Math.Linear(0.2, 1.0, startProgress);
            throttle = Math.min(throttle, startThrottle);
        }
    }

        const angleSeverity = Math.abs(angleDiff);
        if (angleSeverity > 0.6) throttle = 0.75;
        if (angleSeverity > 0.9) throttle = 0.45;
        if (angleSeverity > 1.2) throttle = 0.2;

        if (speedMph > targetTop + 2) throttle = Math.min(throttle, 0.3);
        if (speedMph > targetTop + 5) throttle = 0;

        let brake = 0;
        if (speedMph > targetTop + 6) brake = 0.45;
        if (speedMph > targetTop + 10) brake = 0.8;

        // Anticipate sharper curves by looking 1 waypoint ahead
        const nextIdx = (car.nextWaypoint + 1) % waypoints.length;
        const nextWp = waypoints[nextIdx];
        if (nextWp) {
            const angleToNext = Phaser.Math.Angle.Between(sprite.x, sprite.y, nextWp.x, nextWp.y);
            const curvature = Math.abs(Phaser.Math.Angle.Wrap(angleToNext - targetAngle));
            if (curvature > 0.8) throttle = Math.min(throttle, 0.6);
            if (curvature > 1.1) throttle = Math.min(throttle, 0.4);
        }

        // Proximity awareness: if another car is close in front, lift and bias steer slightly away
        const lead = this.findLeadCarAhead(car, 350, Math.PI / 2.5);
        if (lead) {
            throttle = Math.min(throttle, 0.45);
            const relAngle = Phaser.Math.Angle.Between(sprite.x, sprite.y, lead.sprite.x, lead.sprite.y) - sprite.rotation;
            const away = Phaser.Math.Angle.Wrap(relAngle) > 0 ? -0.35 : 0.35;
            meta.steer = Phaser.Math.Clamp(Phaser.Math.Linear(meta.steer, meta.steer + away * 0.5, 0.3), -1, 1);
            if (speedMph > targetTop - 5) brake = Math.max(brake, 0.4);
        }

        const jitter = randRange(-profile.jitter, profile.jitter);
        throttle = Phaser.Math.Clamp((throttle + jitter) * profile.throttleScale, 0, 1.2);
        brake = Phaser.Math.Clamp(brake * profile.brakeScale, 0, 1);

        const playerProgress = this.playerCar?.raceProgress || 0;
        if (!car.finished && !this.playerCar.finished) {
            if (car.raceProgress < playerProgress - 0.25) {
                throttle = Math.min(1.15, throttle + 0.35 * (meta.aggression || 1));
            } else if (car.raceProgress > playerProgress + 0.2) {
                throttle = Math.max(0.45, throttle - 0.25);
            }
        }

        meta.throttle = Phaser.Math.Linear(meta.throttle || 0, throttle, 0.1);
        meta.brake = Phaser.Math.Linear(meta.brake || 0, brake, 0.15);

        return {
            throttle: Phaser.Math.Clamp(meta.throttle, 0, 1.2),
            brake: Phaser.Math.Clamp(meta.brake, 0, 1),
            steer: Phaser.Math.Clamp(meta.steer, -1, 1),
            reverse: false,
            handbrake: false
        };
    }

    findLeadCarAhead(car, distance = 350, halfFov = Math.PI / 2.5) {
        const sprite = car.sprite;
        let best = null;
        let bestDist = Infinity;
        for (const other of this.racers) {
            if (other === car || other.retired) continue;
            const dx = other.sprite.x - sprite.x;
            const dy = other.sprite.y - sprite.y;
            const dist = Math.hypot(dx, dy);
            if (dist > distance) continue;
            const ang = Math.atan2(dy, dx);
            const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - sprite.rotation));
            if (diff <= halfFov && dist < bestDist) {
                best = other;
                bestDist = dist;
            }
        }
        return best;
    }

    constrainCarToTrack(car) {
        if (!car || this.trackId !== 'daytona') return;
        const cfg = this.trackConfig;
        const sprite = car.sprite;
        const dx = sprite.x - cfg.centerX;
        const dy = sprite.y - cfg.centerY;

        const innerA = cfg.innerRadiusX + 80;
        const innerB = cfg.innerRadiusY + 80;
        const innerValue = (dx * dx) / (innerA * innerA) + (dy * dy) / (innerB * innerB);

    if (innerValue < 1) {
            const factor = 1 / Math.sqrt(innerValue);
            const targetX = cfg.centerX + dx * factor * 1.02;
            const targetY = cfg.centerY + dy * factor * 1.02;

            sprite.setPosition(targetX, targetY);
            sprite.body.position.set(targetX - sprite.body.halfWidth, targetY - sprite.body.halfHeight);
            // Softer inner correction to reduce oscillations
            sprite.body.velocity.set(sprite.body.velocity.x * 0.75, sprite.body.velocity.y * 0.2);

            car.localVelocity.x *= 0.8;
            car.localVelocity.y *= 0.4;
            car.angularVelocity *= 0.35;

            this.registerBoundaryHit(car, 'inner');
        }

        const outerA = cfg.outerRadiusX - 160;
        const outerB = cfg.outerRadiusY - 160;
        const outerValue = (dx * dx) / (outerA * outerA) + (dy * dy) / (outerB * outerB);

    if (outerValue > 1) {
            const factor = 1 / Math.sqrt(outerValue);
            const targetX = cfg.centerX + dx * factor * 0.98;
            const targetY = cfg.centerY + dy * factor * 0.98;

            sprite.setPosition(targetX, targetY);
            sprite.body.position.set(targetX - sprite.body.halfWidth, targetY - sprite.body.halfHeight);
            // Softer outer correction
            sprite.body.velocity.set(sprite.body.velocity.x * 0.2, sprite.body.velocity.y * 0.5);

            car.localVelocity.x *= 0.5;
            car.localVelocity.y *= 0.4;
            car.angularVelocity *= 0.45;

            this.registerBoundaryHit(car, 'outer');
        }
    }

    registerBoundaryHit(car, type) {
        if (!this.isRaceTrack) return;
        const now = this.time.now;
        if (now - car.lastBoundaryHit > 600) {
            const base = type === 'outer' ? 18 : 12;
            this.applyDamage(car, base, 'wall', car.carSpeedMph);
            car.lastBoundaryHit = now;
            if (car === this.playerCar) {
                this.showRaceMessage(type === 'outer' ? 'Outside wall! Ease up.' : 'Stay off the apron!', 1100);
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

        if (car === this.playerCar && !car.finished && car.lap > this.playerLapCounter) {
            const lapTime = this.raceTimer - this.playerLapStartTime;
            if (lapTime > 1) {
                this.playerLapHistory.push(lapTime);
                this.showRaceMessage(`Lap ${this.playerLapHistory.length} complete • ${lapTime.toFixed(2)}s`, 2300);
            }
            this.playerLapStartTime = this.raceTimer;
            this.playerLapCounter = car.lap;
        }

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
                const currentLap = clamp(this.playerCar.lap, 1, laps);
                this.hud.lap.textContent = `${currentLap} / ${laps}`;
            }
        }
    }

    handleCarWallCollision(sprite) {
        const car = sprite.getData('carRef');
        if (!car) return;

        const impactSpeed = car.speed || sprite.body.speed;
        if (impactSpeed < 60) return;

        car.localVelocity.x *= 0.55;
        car.localVelocity.y *= -0.35;
        car.angularVelocity *= -0.32;

        if (this.isRaceTrack) {
            const mph = Math.max(car.carSpeedMph, impactSpeed / PIXELS_PER_MPH);
            const baseDamage = Phaser.Math.Clamp(Math.round((mph / (car.data.topSpeedMph || 1)) * 20), 6, 24);
            this.applyDamage(car, baseDamage, 'wall', mph);
        }
    }

    handleCarVsCarCollision(spriteA, spriteB) {
        const carA = spriteA.getData('carRef');
        const carB = spriteB.getData('carRef');
        if (!carA || !carB) return;

        const dvx = spriteA.body.velocity.x - spriteB.body.velocity.x;
        const dvy = spriteA.body.velocity.y - spriteB.body.velocity.y;
        const relativeSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
        const relativeMph = relativeSpeed / PIXELS_PER_MPH;

        if (relativeSpeed < 35) return;

        carA.localVelocity.x *= 0.82;
        carB.localVelocity.x *= 0.82;
        carA.localVelocity.y += (Math.random() - 0.5) * 24;
        carB.localVelocity.y += (Math.random() - 0.5) * 24;

        if (this.isRaceTrack) {
            const base = Phaser.Math.Clamp(Math.round((relativeMph / (carA.data.topSpeedMph || 1)) * 24), 4, 28);
            this.applyDamage(carA, base, 'collision', relativeMph);
            this.applyDamage(carB, base, 'collision', relativeMph);
        }
    }

    applyDamage(car, baseAmount, source = '', impactMph = 0) {
        if (!car || car.retired || !this.isRaceTrack) return;

        if (car.invulnerableUntil && this.time.now < car.invulnerableUntil) {
            return;
        }

        const speedRatio = impactMph ? Phaser.Math.Clamp(impactMph / (car.data.topSpeedMph || 1), 0, 2.5) : 0.6;
        const durability = car.durability || 1;
        const scaledDamage = baseAmount * (0.45 + speedRatio) / durability;
        const finalDamage = Math.max(1, Math.round(scaledDamage));

        car.health = Math.max(0, car.health - finalDamage);
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
            const bestLap = this.playerLapHistory.length > 0
                ? Math.min(...this.playerLapHistory).toFixed(2)
                : null;
            let message = `Race Complete! You finished ${placement}${suffix}.`;
            if (bestLap) {
                message += ` Best lap ${bestLap}s.`;
            }
            this.showRaceMessage(message, 5000);
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
            car.invulnerableUntil = this.time.now + 4000;

            this.finishOrder = [];
            this.aiCars.forEach((ai, index) => {
                const spawnTarget = this.trackConfig.startPositions[index + 1] || spawn;
                ai.sprite.setPosition(spawnTarget.x, spawnTarget.y);
                ai.sprite.body.position.set(spawnTarget.x - ai.sprite.body.halfWidth, spawnTarget.y - ai.sprite.body.halfHeight);
                ai.sprite.setRotation(spawnTarget.angle);
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

    createMinimap() {
        const cam = this.cameras.main;
        const size = 220;
        const x = cam.width - size - 28;
        const y = 24;

        this.minimapConfig = {
            x,
            y,
            size
        };

        this.minimapGraphics = this.add.graphics()
            .setScrollFactor(0)
            .setDepth(1001);
    }

    drawMinimap() {
        if (!this.minimapGraphics) return;

        const { x, y, size } = this.minimapConfig;
        const g = this.minimapGraphics;
        g.clear();

        g.fillStyle(0x000000, 0.65);
        g.fillRoundedRect(x, y, size, size, 16);
        g.lineStyle(2, 0xffffff, 0.7);
        g.strokeRoundedRect(x, y, size, size, 16);

        const scale = Math.min((size - 40) / this.worldWidth, (size - 40) / this.worldHeight);
        const offsetX = x + (size - this.worldWidth * scale) / 2;
        const offsetY = y + (size - this.worldHeight * scale) / 2;

        if (this.trackId === 'daytona') {
            g.lineStyle(2, 0x3ec1ff, 0.75);
            g.strokeEllipse(
                x + size / 2,
                y + size / 2,
                this.trackConfig.outerRadiusX * 2 * scale,
                this.trackConfig.outerRadiusY * 2 * scale
            );
            g.lineStyle(2, 0xf5ca50, 0.6);
            g.strokeEllipse(
                x + size / 2,
                y + size / 2,
                this.trackConfig.innerRadiusX * 2 * scale,
                this.trackConfig.innerRadiusY * 2 * scale
            );
        } else if (this.trackId === 'lot') {
            g.lineStyle(2, 0x46ff9d, 0.7);
            g.strokeRect(offsetX, offsetY, this.worldWidth * scale, this.worldHeight * scale);
        }

        this.cars.forEach((car) => {
            const color = car === this.playerCar ? 0xff5252 : car.isAI ? 0x4ec9ff : 0xffffff;
            const px = offsetX + car.sprite.x * scale;
            const py = offsetY + car.sprite.y * scale;

            g.fillStyle(color, 1);
            g.fillCircle(px, py, car === this.playerCar ? 5 : 4);

            const headingLength = car === this.playerCar ? 18 : 14;
            g.lineStyle(1.5, color, 0.8);
            g.beginPath();
            g.moveTo(px, py);
            g.lineTo(px + Math.cos(car.sprite.rotation) * headingLength, py + Math.sin(car.sprite.rotation) * headingLength);
            g.strokePath();
        });
    }

    updateHUD(force = false) {
        if (!this.playerCar) return;

        this.hud.speed.textContent = this.playerCar.carSpeedMph;
        this.hud.carName.textContent = `${this.playerCar.data.name} • ${this.playerCar.scheme.name}`;
        this.hud.trackName.textContent = this.trackConfig.name;

        if (this.isRaceTrack || force) {
            const healthRatio = Math.max(0, Math.round((this.playerCar.health / this.playerCar.maxHealth) * 100));
            this.hud.health.textContent = this.playerCar.retired ? '0%' : `${healthRatio}%`;
            this.hud.healthBar.style.width = `${healthRatio}%`;
        } else {
            this.hud.health.textContent = '∞';
            this.hud.healthBar.style.width = '100%';
        }

        if (!this.isRaceTrack) {
            this.hud.lap.textContent = '--';
            this.hud.position.textContent = '--';
        }
    }

    update(_, delta) {
        if (!this.playerCar) return;

        const dt = delta / 1000;

        if (this.keys.menu.isDown && !this.ctMenuPing) {
            this.ctMenuPing = true;
            this.scene.start('MenuScene');
            return;
        } else if (!this.keys.menu.isDown) {
            this.ctMenuPing = false;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.weather) && this.trackConfig.allowRain) {
            this.toggleWeather();
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
            this.resetPlayerCar();
        }

        if (this.raceState === 'running') {
            this.raceTimer += dt;
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
        this.drawMinimap();

        if (this.isRaceTrack && this.directionArrow && this.playerCar && !this.playerCar.finished) {
            const raceCfg = this.trackConfig.race;
            const wp = raceCfg.waypoints[this.playerCar.nextWaypoint];
            if (wp) {
                const sprite = this.playerCar.sprite;
                const targetAngle = Phaser.Math.Angle.Between(sprite.x, sprite.y, wp.x, wp.y);
                const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - sprite.rotation);
                this.directionArrow.setVisible(true);
                this.directionArrow.rotation = angleDiff;
            }
        } else if (this.directionArrow) {
            this.directionArrow.setVisible(false);
        }
    }
}