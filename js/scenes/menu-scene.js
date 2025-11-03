// js/scenes/menu-scene.js
import { getCarDisplayName, getDefaultSchemeId } from '../car-presets.js';
import { TRACKS } from '../track-config.js';
import { ensureGameTextures } from '../texture-factory.js';
import { getSessionSettings, setSessionSettings } from '../session-state.js';
import { AppSettingsModal } from '../app-settings.js';
import { CustomizeCarModal } from './customize-car-modal.js';

const DIFFICULTY_LABELS = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
};

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.trackCards = [];
        this.difficultyButtons = [];
        this.settingsModal = null;
        this.customizeCarModal = null;
    }

    init() {
        this.settings = getSessionSettings();
        this.trackCards = [];
        this.difficultyButtons = [];
    }

    create() {
        ensureGameTextures(this);

        this.add.rectangle(640, 360, 1280, 720, 0x000c17, 0.45);
        this.add.rectangle(640, 360, 940, 560, 0x040b16, 0.75).setStrokeStyle(6, 0x0f4a8e, 0.35);

        this.add.text(640, 110, 'DRIFT KING', {
            fontFamily: 'Arial Black',
            fontSize: '80px',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(640, 170, 'Build your event • Tune rivals • Hit the oval or drift lot', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Create modals
        this.customizeCarModal = new CustomizeCarModal(this);
        this.customizeCarModal.create();
        
        this.settingsModal = new AppSettingsModal(this, this.customizeCarModal);
        this.settingsModal.create();

        // Settings button in top-right corner
        const settingsBtn = this.createButton(1120, 50, 120, 48, '⚙️ Settings', () => this.openSettings(), {
            fontSize: '16px'
        });
        this.add.existing(settingsBtn);

        this.createMainPanel();
        this.bindKeyboard();

        this.resetHudDefaults();
        this.refreshSummaries();

        // Listen for updates from modals
        this.events.on('settings-updated', () => {
            this.refreshSummaries();
            this.updateAIControlsState();
        });
        this.events.on('customization-updated', () => {
            this.refreshSummaries();
        });
    }

    bindKeyboard() {
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.customizeCarModal?.isVisible()) {
                this.customizeCarModal.hide();
            } else if (this.settingsModal?.isVisible()) {
                this.settingsModal.hide();
            }
        });
    }

    openSettings() {
        if (this.settingsModal) {
            this.settingsModal.show();
        }
    }

    resetHudDefaults() {
        document.getElementById('carType').textContent = '--';
        document.getElementById('trackName').textContent = 'Select a Track';
        document.getElementById('speedDisplay').textContent = '0';
        document.getElementById('weather').textContent = 'Clear ☀️';
        document.getElementById('healthContainer').classList.add('hidden');
        document.getElementById('lapContainer').classList.add('hidden');
        document.getElementById('positionContainer').classList.add('hidden');
    }

    createMainPanel() {
        const panel = this.add.container(640, 390);
        const panelWidth = 960;
        const panelHeight = 380;

        const backdrop = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x06162c, 0.85)
            .setStrokeStyle(3, 0x1a7be1, 0.6);
        panel.add(backdrop);

        // Current Car Display (read-only)
        this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 30, 'SELECTED CAR', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ffd700'
        }).setOrigin(0, 0.5).setDepth(10).setScrollFactor(0);

        this.carSummaryText = this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 72, '', {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);

        panel.add(this.carSummaryText);

        const customizeHint = this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 100, '(Open Settings to customize your car)', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#8fa8cc',
            fontStyle: 'italic'
        }).setOrigin(0, 0.5);
        panel.add(customizeHint);

        // Track section
        this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 140, 'TRACK PRESET', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ffd700'
        }).setOrigin(0, 0.5);

        const trackEntries = Object.values(TRACKS);
        const baseTrackX = -panelWidth / 2 + 120;
        trackEntries.forEach((track, index) => {
            const card = this.createTrackCard(baseTrackX + index * 300, -panelHeight / 2 + 218, track);
            panel.add(card.container);
            this.trackCards.push(card);
        });

        // AI section
        this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 300, 'BOT GRID', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ffd700'
        }).setOrigin(0, 0.5);

        this.aiInfoText = this.add.text(-panelWidth / 2 + 36, -panelHeight / 2 + 342, '', {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#cfdcff'
        }).setOrigin(0, 0.5);
        panel.add(this.aiInfoText);

        this.aiMinusButton = this.createButton(-panelWidth / 2 + 220, -panelHeight / 2 + 342, 48, 44, '−', () => this.adjustBots(-1));
        this.aiPlusButton = this.createButton(-panelWidth / 2 + 360, -panelHeight / 2 + 342, 48, 44, '+', () => this.adjustBots(1));
        panel.add(this.aiMinusButton);
        panel.add(this.aiPlusButton);

        this.difficultyLabel = this.add.text(panelWidth / 2 - 370, -panelHeight / 2 + 302, 'Difficulty', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            fill: '#ffd700'
        }).setOrigin(0, 0.5);
        panel.add(this.difficultyLabel);

        const diffKeys = ['easy', 'medium', 'hard'];
        this.difficultyButtons = diffKeys.map((key, index) => {
            const btn = this.createToggleButton(panelWidth / 2 - 400 + index * 140, -panelHeight / 2 + 346, 120, 44, DIFFICULTY_LABELS[key], () => this.setDifficulty(key));
            panel.add(btn.container);
            return { key, ...btn };
        });

        // Start button
        this.startButton = this.createButton(0, panelHeight / 2 - 50, 260, 60, 'Start Event', () => this.launchTrack(), {
            fontSize: '26px',
            primary: true
        });
        panel.add(this.startButton);

        this.panel = panel;
        this.updateTrackHighlights();
        this.updateDifficultyButtons();
        this.updateAIControlsState();
    }

    createTrackCard(x, y, track) {
        const container = this.add.container(x, y);
        const width = 260;
        const height = 140;

        const bg = this.add.rectangle(0, 0, width, height, 0x0c1120, 0.82)
            .setStrokeStyle(2, track.type === 'race' ? 0xff6f61 : 0x6fff61, 0.65);
        const title = this.add.text(-width / 2 + 16, -38, track.name, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0, 0);
        const desc = this.add.text(-width / 2 + 16, -10, track.description, {
            fontFamily: 'Arial',
            fontSize: '15px',
            fill: '#c1cbe0',
            wordWrap: { width: width - 32 }
        });
        const mode = this.add.text(-width / 2 + 16, height / 2 - 24, track.type === 'race' ? 'Mode: Race vs Bots' : 'Mode: Freeroam Drift', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: track.type === 'race' ? '#ffb7a1' : '#aaffa1'
        }).setOrigin(0, 0.5);

        container.add([bg, title, desc, mode]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            bg.setFillStyle(0x16203a, 0.92);
        });
        container.on('pointerout', () => {
            if (this.settings.trackId !== track.id) {
                bg.setFillStyle(0x0c1120, 0.82);
            }
        });
        container.on('pointerdown', () => {
            this.selectTrack(track.id);
        });

        return { container, bg, track };
    }

    createButton(x, y, width, height, label, callback, options = {}) {
        const container = this.add.container(x, y);
        const primary = options.primary || false;
        const baseColor = primary ? 0x1c65d8 : 0x14324c;
        const hoverColor = primary ? 0x2a7ef5 : 0x1e435f;

        const bg = this.add.rectangle(0, 0, width, height, baseColor, primary ? 0.95 : 0.85)
            .setStrokeStyle(2, primary ? 0xffffff : 0x8bbcf5, primary ? 0.55 : 0.35);

        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black',
            fontSize: options.fontSize || '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            bg.setFillStyle(hoverColor, primary ? 0.98 : 0.92);
        });
        container.on('pointerout', () => {
            bg.setFillStyle(baseColor, primary ? 0.95 : 0.85);
        });
        container.on('pointerdown', () => {
            this.sound.playAudioSprite?.('ui', 'click');
            callback();
        });

        return container;
    }

    createToggleButton(x, y, width, height, label, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, width, height, 0x16263d, 0.82)
            .setStrokeStyle(2, 0x8bbcf5, 0.5);
        const text = this.add.text(0, 0, label, {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        container.on('pointerover', () => {
            bg.setFillStyle(0x1f3656, 0.9);
        });
        container.on('pointerout', () => {
            if (label !== DIFFICULTY_LABELS[this.settings.aiDifficulty]) {
                bg.setFillStyle(0x16263d, 0.82);
            }
        });
        container.on('pointerdown', () => callback());

        return { container, bg, text };
    }

    selectTrack(trackId) {
    }

    createCarModal() {
        const modal = this.add.container(640, 360).setDepth(2000);
        modal.setVisible(false);
        modal.setActive(false);

        const overlay = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.6);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.hideCarModal());
        modal.add(overlay);
        this.carModalOverlay = overlay;

        const panelWidth = 1020;
        const panelHeight = 540;
        const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x061221, 0.95)
            .setStrokeStyle(3, 0x1c8efc, 0.65);
        modal.add(panelBg);

        const title = this.add.text(0, -panelHeight / 2 + 36, 'Select Vehicle & Livery', {
            fontFamily: 'Arial Black',
            fontSize: '30px',
            fill: '#ffd700'
        }).setOrigin(0.5);
        modal.add(title);

        const closeBtn = this.createButton(panelWidth / 2 - 80, -panelHeight / 2 + 40, 130, 40, 'Close', () => this.hideCarModal());
        modal.add(closeBtn);

        const listContainer = this.add.container(-panelWidth / 2 + 40, -panelHeight / 2 + 90);
        modal.add(listContainer);

        const carOptions = listCarOptions();
        carOptions.forEach((car, index) => {
            const card = this.buildCarCard(car, index);
            card.container.y = index * 150;
            listContainer.add(card.container);
            this.carModalCards.push(card);
        });

        this.carModal = modal;
        this.updateCarModalHighlights();
    }

    buildCarCard(car, index) {
        const width = 940;
        const height = 130;
        const container = this.add.container(0, 0);
        const bg = this.add.rectangle(0, 0, width, height, 0x0c1829, 0.82)
            .setStrokeStyle(2, 0x1f6cee, 0.45);

        const title = this.add.text(-width / 2 + 20, -50, car.name, {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            fill: '#ffffff'
        }).setOrigin(0, 0);

        const desc = this.add.text(-width / 2 + 20, -20, car.description, {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#c9d8ff'
        }).setOrigin(0, 0);

        const stats = this.add.text(-width / 2 + 20, 10, `Top ${car.topSpeedMph} mph • Health ${car.health} • Drift bias ${(car.cornerStiffnessRear / 100).toFixed(0)}%`, {
            fontFamily: 'Arial',
            fontSize: '15px',
            fill: '#ffd700'
        }).setOrigin(0, 0);

        const previewScheme = car.schemes[0];
        const previewImage = this.add.image(width / 2 - 140, 0, `car_${car.id}_${previewScheme.id}`)
            .setScale(0.6)
            .setAngle(-90);

        container.add([bg, title, desc, stats, previewImage]);

        const schemeRow = this.add.container(-width / 2 + 20, 44);
        container.add(schemeRow);

        const schemeButtons = [];

        car.schemes.forEach((scheme, idx) => {
            const chip = this.add.rectangle(idx * 60, 0, 48, 48, scheme.paint.base, 1)
                .setStrokeStyle(2, scheme.paint.accent, 0.8)
                .setOrigin(0, 0.5);

            chip.setInteractive(new Phaser.Geom.Rectangle(0, -24, 48, 48), Phaser.Geom.Rectangle.Contains);
            chip.on('pointerdown', () => {
                this.selectCar(car.id, scheme.id);
                previewImage.setTexture(`car_${car.id}_${scheme.id}`);
                this.updateCarModalHighlights();
                this.refreshSummaries();
            });

            schemeRow.add(chip);
            schemeButtons.push({ chip, scheme });
        });

        this.carModalSchemeButtons.set(car.id, { schemeButtons, previewImage, bg });

        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', () => {
            this.selectCar(car.id, this.settings.schemeId ?? getDefaultSchemeId(car.id));
            previewImage.setTexture(`car_${car.id}_${this.settings.schemeId}`);
            this.updateCarModalHighlights();
            this.refreshSummaries();
        });

        return { container, bg, car };
    }

    showCarModal() {
        this.carModal.setVisible(true);
        this.carModal.setActive(true);
        this.carModalOverlay.setInteractive();
    }

    hideCarModal() {
        this.carModal.setVisible(false);
        this.carModal.setActive(false);
        this.carModalOverlay.disableInteractive();
    }

    selectCar(carId, schemeId) {
        const validatedScheme = getCarScheme(carId, schemeId)?.id ?? getDefaultSchemeId(carId);
        this.settings = setSessionSettings({
            carId,
            schemeId: validatedScheme
        });
    }

    selectTrack(trackId) {
        const track = TRACKS[trackId] || TRACKS.daytona;
        const maxAI = track.maxAI ?? 0;
        let aiCount = this.settings.aiCount;

        if (track.type !== 'race') {
            aiCount = 0;
        } else {
            aiCount = Math.min(aiCount, maxAI);
        }

        this.settings = setSessionSettings({
            trackId: track.id,
            aiCount
        });

        this.updateTrackHighlights();
        this.updateAIControlsState();
        this.refreshSummaries();
    }

    adjustBots(delta) {
        const track = TRACKS[this.settings.trackId];
        if (!track || track.type !== 'race') {
            this.settings = setSessionSettings({ aiCount: 0 });
            this.updateAIControlsState();
            this.refreshSummaries();
            return;
        }

        const maxAI = track.maxAI ?? 0;
        const newCount = Phaser.Math.Clamp(this.settings.aiCount + delta, 0, maxAI);
        this.settings = setSessionSettings({ aiCount: newCount });
        this.updateAIControlsState();
        this.refreshSummaries();
    }

    setDifficulty(key) {
        if (this.settings.aiCount <= 0) return;
        if (!DIFFICULTY_LABELS[key]) return;
        this.settings = setSessionSettings({ aiDifficulty: key });
        this.updateDifficultyButtons();
        this.refreshSummaries();
    }

    updateTrackHighlights() {
        this.trackCards.forEach(({ bg, track }) => {
            if (track.id === this.settings.trackId) {
                bg.setFillStyle(0x1f3656, 0.95);
                bg.setStrokeStyle(3, track.type === 'race' ? 0xfff07a : 0xa1ff9b, 0.9);
            } else {
                bg.setFillStyle(0x0c1120, 0.82);
                bg.setStrokeStyle(2, track.type === 'race' ? 0xff6f61 : 0x6fff61, 0.65);
            }
        });
    }

    updateDifficultyButtons() {
        this.difficultyButtons.forEach(({ key, bg, text }) => {
            if (key === this.settings.aiDifficulty && this.settings.aiCount > 0) {
                bg.setFillStyle(0x265296, 0.92);
                bg.setStrokeStyle(2, 0xffd966, 0.9);
                text.setColor('#ffffff');
            } else {
                bg.setFillStyle(0x16263d, 0.82);
                bg.setStrokeStyle(2, 0x8bbcf5, 0.5);
                text.setColor('#d8e7ff');
            }

            if (this.settings.aiCount === 0) {
                bg.setAlpha(0.35);
                text.setAlpha(0.35);
                bg.disableInteractive();
            } else {
                bg.setAlpha(1);
                text.setAlpha(1);
                bg.setInteractive();
            }
        });
    }

    updateAIControlsState() {
        const track = TRACKS[this.settings.trackId];
        const isRace = track.type === 'race';
        const maxAI = track.maxAI ?? 0;

        this.aiInfoText.setText(isRace
            ? `Bots: ${this.settings.aiCount} / ${maxAI}`
            : 'Bots disabled on drift playgrounds.');

        if (!isRace) {
            this.aiMinusButton.setAlpha(0.25);
            this.aiPlusButton.setAlpha(0.25);
            this.aiMinusButton.disableInteractive();
            this.aiPlusButton.disableInteractive();
            this.difficultyLabel.setAlpha(0.35);
        } else {
            this.aiMinusButton.setAlpha(1);
            this.aiPlusButton.setAlpha(1);
            this.aiMinusButton.setInteractive();
            this.aiPlusButton.setInteractive();
            this.difficultyLabel.setAlpha(1);
        }

        this.updateDifficultyButtons();
    }

    refreshSummaries() {
        this.settings = getSessionSettings();
        this.carSummaryText.setText(getCarDisplayName(this.settings.carId, this.settings.schemeId));

        const track = TRACKS[this.settings.trackId] || TRACKS.daytona;
        this.startButton.list[1].setText(`Start ${track.type === 'race' ? 'Race' : 'Session'}`);
    }

    launchTrack() {
        const track = TRACKS[this.settings.trackId] || TRACKS.daytona;
        const data = {
            track: track.id,
            car: this.settings.carId,
            schemeId: this.settings.schemeId ?? getDefaultSchemeId(this.settings.carId),
            aiCount: track.type === 'race' ? this.settings.aiCount : 0,
            aiDifficulty: this.settings.aiDifficulty,
            customPhysics: this.settings.customPhysics || {}
        };
        this.scene.start('GameScene', data);
    }
}