// js/app-settings.js
import { getSessionSettings, setSessionSettings } from './session-state.js';

/**
 * AppSettingsModal - A settings modal with difficulty presets and advanced customization access
 * Provides Easy/Medium/Hard difficulty options + button to open customize-car-modal.js
 */
export class AppSettingsModal {
    constructor(scene, customizeCarModal) {
        this.scene = scene;
        this.customizeCarModal = customizeCarModal;
        this.container = null;
        this.difficultyButtons = [];
        
        this.difficulties = {
            easy: {
                label: 'Easy',
                description: 'Relaxed settings for casual play',
                aiDifficulty: 'easy',
                defaultAiCount: 1
            },
            medium: {
                label: 'Medium',
                description: 'Balanced challenge for most players',
                aiDifficulty: 'medium',
                defaultAiCount: 2
            },
            hard: {
                label: 'Hard',
                description: 'Maximum challenge for experts',
                aiDifficulty: 'hard',
                defaultAiCount: 3
            }
        };
    }

    create() {
        this.container = this.scene.add.container(640, 360).setDepth(3000);
        this.container.setVisible(false);
        this.container.setActive(false);

        // Dark overlay
        const overlay = this.scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.7);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.hide());
        this.container.add(overlay);
        this.overlay = overlay;

        // Modal panel
        const panelWidth = 760;
        const panelHeight = 620;
        const panelBg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x0a1424, 0.96)
            .setStrokeStyle(4, 0x2a8fff, 0.7);
        this.container.add(panelBg);

        // Title
        const title = this.scene.add.text(0, -panelHeight / 2 + 45, '⚙️ SETTINGS', {
            fontFamily: 'Arial Black',
            fontSize: '38px',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.container.add(title);

        // Close button
        const closeBtn = this.createButton(panelWidth / 2 - 90, -panelHeight / 2 + 48, 150, 46, 'Close', () => this.hide());
        this.container.add(closeBtn);

        // Difficulty Section
        const diffLabel = this.scene.add.text(0, -panelHeight / 2 + 130, 'DIFFICULTY PRESET', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ffd700'
        }).setOrigin(0.5);
        this.container.add(diffLabel);

        const diffDesc = this.scene.add.text(0, -panelHeight / 2 + 168, 'Choose your challenge level (affects AI difficulty & count)', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#afc5e8',
            align: 'center'
        }).setOrigin(0.5);
        this.container.add(diffDesc);

        // Difficulty buttons
        const diffKeys = ['easy', 'medium', 'hard'];
        const buttonWidth = 200;
        const buttonGap = 40;
        const startX = -(buttonWidth * 1.5 + buttonGap);

        diffKeys.forEach((key, index) => {
            const x = startX + index * (buttonWidth + buttonGap);
            const y = -panelHeight / 2 + 260;
            const card = this.createDifficultyCard(x, y, buttonWidth, 140, key);
            this.container.add(card.container);
            this.difficultyButtons.push(card);
        });

        // Divider
        const divider = this.scene.add.rectangle(0, -panelHeight / 2 + 370, panelWidth - 100, 2, 0x2a8fff, 0.4);
        this.container.add(divider);

        // Advanced Customization Section
        const customLabel = this.scene.add.text(0, -panelHeight / 2 + 420, 'ADVANCED CUSTOMIZATION', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            fill: '#ffd700'
        }).setOrigin(0.5);
        this.container.add(customLabel);

        const customDesc = this.scene.add.text(0, -panelHeight / 2 + 458, 'Fine-tune your vehicle and gameplay parameters', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#afc5e8',
            align: 'center'
        }).setOrigin(0.5);
        this.container.add(customDesc);

        // Advanced Customization button
        const customBtn = this.createButton(0, -panelHeight / 2 + 520, 380, 60, '🔧 Open Car Customization', () => this.openCustomization(), {
            fontSize: '22px',
            primary: true
        });
        this.container.add(customBtn);

        this.updateDifficultyHighlight();
    }

    createDifficultyCard(x, y, width, height, key) {
        const container = this.scene.add.container(x, y);
        const config = this.difficulties[key];

        const bg = this.scene.add.rectangle(0, 0, width, height, 0x0f1f3a, 0.85)
            .setStrokeStyle(2, 0x2a8fff, 0.5);

        const label = this.scene.add.text(0, -height / 2 + 30, config.label, {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const desc = this.scene.add.text(0, 0, config.description, {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#b8d0f5',
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        const aiInfo = this.scene.add.text(0, height / 2 - 30, `AI: ${config.aiDifficulty} (${config.defaultAiCount} bots)`, {
            fontFamily: 'Arial',
            fontSize: '13px',
            fill: '#ffd966'
        }).setOrigin(0.5);

        container.add([bg, label, desc, aiInfo]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            bg.setFillStyle(0x1a3558, 0.95);
        });
        container.on('pointerout', () => {
            const settings = getSessionSettings();
            if (settings.aiDifficulty !== key) {
                bg.setFillStyle(0x0f1f3a, 0.85);
            }
        });
        container.on('pointerdown', () => {
            this.selectDifficulty(key);
        });

        return { container, bg, key, config };
    }

    createButton(x, y, width, height, label, callback, options = {}) {
        const container = this.scene.add.container(x, y);
        const primary = options.primary || false;
        const baseColor = primary ? 0x1e6fdb : 0x16334f;
        const hoverColor = primary ? 0x2d85f7 : 0x20475e;

        const bg = this.scene.add.rectangle(0, 0, width, height, baseColor, primary ? 0.95 : 0.88)
            .setStrokeStyle(2, primary ? 0xffffff : 0x6da8ff, primary ? 0.6 : 0.4);

        const text = this.scene.add.text(0, 0, label, {
            fontFamily: 'Arial Black',
            fontSize: options.fontSize || '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            bg.setFillStyle(hoverColor, primary ? 0.98 : 0.94);
        });
        container.on('pointerout', () => {
            bg.setFillStyle(baseColor, primary ? 0.95 : 0.88);
        });
        container.on('pointerdown', () => {
            this.scene.sound.playAudioSprite?.('ui', 'click');
            callback();
        });

        return container;
    }

    selectDifficulty(key) {
        const config = this.difficulties[key];
        const settings = getSessionSettings();
        
        // Update session settings with new difficulty preset
        setSessionSettings({
            aiDifficulty: config.aiDifficulty,
            aiCount: config.defaultAiCount
        });

        this.updateDifficultyHighlight();
        
        // Notify parent scene to update UI
        if (this.scene.events) {
            this.scene.events.emit('settings-updated');
        }
    }

    updateDifficultyHighlight() {
        const settings = getSessionSettings();
        
        this.difficultyButtons.forEach(({ bg, key, container }) => {
            if (settings.aiDifficulty === key) {
                bg.setFillStyle(0x2a5a9e, 0.95);
                bg.setStrokeStyle(3, 0xffd966, 0.85);
            } else {
                bg.setFillStyle(0x0f1f3a, 0.85);
                bg.setStrokeStyle(2, 0x2a8fff, 0.5);
            }
        });
    }

    openCustomization() {
        // Hide settings modal
        this.hide();
        
        // Open car customization modal
        if (this.customizeCarModal) {
            this.customizeCarModal.show();
        }
    }

    show() {
        this.container.setVisible(true);
        this.container.setActive(true);
        this.overlay.setInteractive();
        this.updateDifficultyHighlight();
    }

    hide() {
        this.container.setVisible(false);
        this.container.setActive(false);
        this.overlay.disableInteractive();
    }

    isVisible() {
        return this.container && this.container.visible;
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
