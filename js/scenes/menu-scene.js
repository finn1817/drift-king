// js/scenes/menu-scene.js
import { CAR_TYPES } from '../car-presets.js';
import { TRACKS } from '../track-config.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedCarId = 'drift';
        this.trackButtons = [];
        this.carCards = [];
    }

    init() {
        this.selectedCarId = 'drift';
        this.trackButtons = [];
        this.carCards = [];
    }

    create() {
        this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.25);

        this.add.text(640, 110, 'DRIFT KING', {
            fontFamily: 'Arial Black',
            fontSize: '78px',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(640, 170, 'Drift Playground & Daytona-Style Oval Duel', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.createCarSelector();
        this.createTrackSelector();

        this.add.text(640, 650, 'Tip: Pick a car, then choose your track. Daytona launches a race vs AI!', {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#cccccc'
        }).setOrigin(0.5);

        document.getElementById('carType').textContent = '--';
        document.getElementById('trackName').textContent = 'Select a Track';
        document.getElementById('speedDisplay').textContent = '0';
        document.getElementById('weather').textContent = 'Clear ☀️';
        document.getElementById('healthContainer').classList.add('hidden');
        document.getElementById('lapContainer').classList.add('hidden');
        document.getElementById('positionContainer').classList.add('hidden');
    }

    createCarSelector() {
        this.add.text(360, 235, 'SELECT YOUR CAR', {
            fontFamily: 'Arial Black',
            fontSize: '30px',
            fill: '#ffd700'
        }).setOrigin(0.5);

        const carEntries = Object.values(CAR_TYPES);
        carEntries.forEach((car, index) => {
            const baseY = 295 + index * 95;
            const container = this.add.container(240, baseY);
            const bg = this.add.rectangle(0, 0, 420, 82, 0x0c1424, 0.68).setStrokeStyle(2, 0x89c4ff, 0.35);
            const title = this.add.text(-190, -24, car.name, {
                fontFamily: 'Arial',
                fontSize: '24px',
                fill: '#ffffff'
            });
            const desc = this.add.text(-190, 6, car.description, {
                fontFamily: 'Arial',
                fontSize: '16px',
                fill: '#a8d8ff'
            });

            const stats = this.add.text(-190, 36, `Top ${car.topSpeedMph} mph • Grip ${(car.cornerStiffnessRear / 100).toFixed(0)}%`, {
                fontFamily: 'Arial',
                fontSize: '16px',
                fill: '#ffd700'
            });

            container.add([bg, title, desc, stats]);
            container.setSize(420, 82);
            container.setInteractive(new Phaser.Geom.Rectangle(-210, -41, 420, 82), Phaser.Geom.Rectangle.Contains);
            container.on('pointerover', () => bg.setFillStyle(0x132444, 0.85));
            container.on('pointerout', () => {
                if (this.selectedCarId !== car.id) {
                    bg.setFillStyle(0x0c1424, 0.68);
                }
            });
            container.on('pointerdown', () => this.selectCar(car.id));

            this.carCards.push({ container, bg, car });
        });

        this.selectCar(this.selectedCarId);
    }

    selectCar(carId) {
        this.selectedCarId = carId;
        this.carCards.forEach(({ bg, car }) => {
            if (car.id === carId) {
                bg.setFillStyle(0x20406a, 0.9);
                bg.setStrokeStyle(3, 0xffd700, 0.8);
            } else {
                bg.setFillStyle(0x0c1424, 0.68);
                bg.setStrokeStyle(2, 0x89c4ff, 0.35);
            }
        });
    }

    createTrackSelector() {
        this.add.text(930, 235, 'CHOOSE YOUR TRACK', {
            fontFamily: 'Arial Black',
            fontSize: '30px',
            fill: '#ffd700'
        }).setOrigin(0.5);

        const trackEntries = Object.values(TRACKS);
        trackEntries.forEach((track, index) => {
            const baseY = 305 + index * 150;
            const container = this.add.container(820, baseY);
            const bg = this.add.rectangle(0, 0, 420, 120, 0x211028, 0.7)
                .setStrokeStyle(3, track.type === 'race' ? 0xff6f61 : 0x6fff61, 0.6);

            const title = this.add.text(-190, -38, track.name, {
                fontFamily: 'Arial',
                fontSize: '26px',
                fill: '#ffffff'
            });

            const desc = this.add.text(-190, -6, track.description, {
                fontFamily: 'Arial',
                fontSize: '16px',
                fill: '#dadada',
                wordWrap: { width: 360 }
            });

            const modeText = track.type === 'race'
                ? 'Mode: Race vs AI • 3 Laps'
                : 'Mode: Freeroam Drift';

            const meta = this.add.text(-190, 40, modeText, {
                fontFamily: 'Arial',
                fontSize: '16px',
                fill: track.type === 'race' ? '#ffab91' : '#aaff91'
            });

            container.add([bg, title, desc, meta]);
            container.setSize(420, 120);
            container.setInteractive(new Phaser.Geom.Rectangle(-210, -60, 420, 120), Phaser.Geom.Rectangle.Contains);

            container.on('pointerover', () => bg.setFillStyle(0x351a3d, 0.85));
            container.on('pointerout', () => bg.setFillStyle(0x211028, 0.7));
            container.on('pointerdown', () => this.launchTrack(track.id));

            this.trackButtons.push({ container, bg, track });
        });
    }

    launchTrack(trackId) {
        this.scene.start('GameScene', {
            track: trackId,
            car: this.selectedCarId
        });
    }
}