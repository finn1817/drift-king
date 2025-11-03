// js/scenes/customize-car-modal.js
import { listCarOptions, getCarScheme, getDefaultSchemeId } from '../car-presets.js';
import { getSessionSettings, setSessionSettings } from '../session-state.js';

/**
 * CustomizeCarModal - Advanced car customization interface
 * Allows selection of car, livery, and fine-tuning of physics parameters
 */
export class CustomizeCarModal {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.carCards = [];
        this.schemeButtons = new Map();
        this.currentCarId = null;
        this.currentSchemeId = null;
        this.customPhysics = {};
        this.sliders = [];
    }

    create() {
        this.container = this.scene.add.container(640, 360).setDepth(4000);
        this.container.setVisible(false);
        this.container.setActive(false);

        // Dark overlay
        const overlay = this.scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.75);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.hide());
        this.container.add(overlay);
        this.overlay = overlay;

        // Main panel
        const panelWidth = 1200;
        const panelHeight = 680;
        const panelBg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x050f1c, 0.97)
            .setStrokeStyle(4, 0x3d9dff, 0.75);
        this.container.add(panelBg);

        // Title
        const title = this.scene.add.text(0, -panelHeight / 2 + 40, '🏎️ CAR CUSTOMIZATION', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.container.add(title);

        // Close button
        const closeBtn = this.createButton(panelWidth / 2 - 100, -panelHeight / 2 + 42, 170, 48, 'Close', () => this.hide());
        this.container.add(closeBtn);

        // Left panel: Car selection
        this.createCarSelectionPanel(-panelWidth / 2 + 30, -panelHeight / 2 + 100, 400, panelHeight - 140);

        // Right panel: Customization
        this.createCustomizationPanel(panelWidth / 2 - 750, -panelHeight / 2 + 100, 740, panelHeight - 140);

        // Apply button
        const applyBtn = this.createButton(0, panelHeight / 2 - 60, 280, 56, 'Apply & Continue', () => this.applyCustomization(), {
            fontSize: '24px',
            primary: true
        });
        this.container.add(applyBtn);

        this.loadCurrentSettings();
    }

    createCarSelectionPanel(x, y, width, height) {
        const panel = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x0a1628, 0.7)
            .setStrokeStyle(2, 0x2a7dcc, 0.4);
        panel.add(bg);

        const label = this.scene.add.text(width / 2, 25, 'SELECT VEHICLE', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            fill: '#ffd700'
        }).setOrigin(0.5);
        panel.add(label);

        // Scrollable car list
        const carOptions = listCarOptions();
        const scrollY = 70;
        
        carOptions.forEach((car, index) => {
            const card = this.createCarCard(car, width / 2, scrollY + index * 130, width - 40, 120);
            panel.add(card.container);
            this.carCards.push(card);
        });

        this.container.add(panel);
        this.carSelectionPanel = panel;
    }

    createCarCard(car, x, y, width, height) {
        const container = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(0, 0, width, height, 0x0d1d32, 0.85)
            .setStrokeStyle(2, 0x2570bd, 0.5);

        const name = this.scene.add.text(-width / 2 + 15, -height / 2 + 18, car.name, {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0, 0);

        const desc = this.scene.add.text(-width / 2 + 15, -height / 2 + 44, car.description, {
            fontFamily: 'Arial',
            fontSize: '13px',
            fill: '#a8c5e8',
            wordWrap: { width: width - 30 }
        }).setOrigin(0, 0);

        const stats = this.scene.add.text(-width / 2 + 15, height / 2 - 22, `${car.topSpeedMph} mph • ${car.health} HP`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            fill: '#ffd966'
        }).setOrigin(0, 0);

        container.add([bg, name, desc, stats]);
        container.setSize(width, height);
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

        container.on('pointerover', () => {
            if (this.currentCarId !== car.id) {
                bg.setFillStyle(0x152a45, 0.92);
            }
        });
        container.on('pointerout', () => {
            if (this.currentCarId !== car.id) {
                bg.setFillStyle(0x0d1d32, 0.85);
            }
        });
        container.on('pointerdown', () => {
            this.selectCar(car.id);
        });

        return { container, bg, car };
    }

    createCustomizationPanel(x, y, width, height) {
        const panel = this.scene.add.container(x, y);
        
        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x0a1628, 0.7)
            .setStrokeStyle(2, 0x2a7dcc, 0.4);
        panel.add(bg);

        const label = this.scene.add.text(width / 2, 25, 'CUSTOMIZE', {
            fontFamily: 'Arial Black',
            fontSize: '20px',
            fill: '#ffd700'
        }).setOrigin(0.5);
        panel.add(label);

        // Car preview area
        this.carPreviewImage = this.scene.add.image(width / 2, 130, 'car_drift_crimson')
            .setScale(1.2)
            .setAngle(-90);
        panel.add(this.carPreviewImage);

        // Selected car name
        this.selectedCarNameText = this.scene.add.text(width / 2, 230, 'Drift King', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        panel.add(this.selectedCarNameText);

        // Livery selection
        const liveryLabel = this.scene.add.text(30, 270, 'LIVERY:', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            fill: '#ffd700'
        }).setOrigin(0, 0);
        panel.add(liveryLabel);

        this.liveryContainer = this.scene.add.container(30, 310);
        panel.add(this.liveryContainer);

        // Physics tuning section
        const tuningLabel = this.scene.add.text(30, 360, 'PHYSICS TUNING:', {
            fontFamily: 'Arial Black',
            fontSize: '16px',
            fill: '#ffd700'
        }).setOrigin(0, 0);
        panel.add(tuningLabel);

        // Create sliders for physics parameters
        const sliderStartY = 400;
        const sliderSpacing = 52;

        const physicsParams = [
            { key: 'engineForce', label: 'Engine Power', min: 0.5, max: 1.5, step: 0.05 },
            { key: 'brakeForce', label: 'Brake Power', min: 0.5, max: 1.5, step: 0.05 },
            { key: 'maxSteerAngle', label: 'Steering Angle', min: 0.7, max: 1.3, step: 0.05 },
            { key: 'cornerStiffness', label: 'Grip Level', min: 0.6, max: 1.4, step: 0.05 },
            { key: 'mass', label: 'Weight', min: 0.8, max: 1.2, step: 0.05 }
        ];

        physicsParams.forEach((param, index) => {
            const slider = this.createSlider(30, sliderStartY + index * sliderSpacing, 680, param);
            panel.add(slider.container);
            this.sliders.push(slider);
        });

        this.container.add(panel);
        this.customizationPanel = panel;
    }

    createSlider(x, y, width, param) {
        const container = this.scene.add.container(x, y);
        
        const labelText = this.scene.add.text(0, -8, param.label, {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0, 0);

        const valueText = this.scene.add.text(width, -8, '1.00x', {
            fontFamily: 'Arial Black',
            fontSize: '14px',
            fill: '#ffd966'
        }).setOrigin(1, 0);

        // Slider track
        const trackHeight = 8;
        const track = this.scene.add.rectangle(width / 2, 16, width - 100, trackHeight, 0x1e3a5c, 0.8)
            .setStrokeStyle(1, 0x4a7ba7, 0.6);

        // Slider fill
        const fill = this.scene.add.rectangle(50, 16, 0, trackHeight, 0x3da0ff, 0.9)
            .setOrigin(0, 0.5);

        // Slider handle
        const handleRadius = 12;
        const handle = this.scene.add.circle(50, 16, handleRadius, 0xffffff, 1)
            .setStrokeStyle(2, 0x3da0ff, 1);

        container.add([labelText, valueText, track, fill, handle]);

        // Interactive dragging
        handle.setInteractive({ draggable: true, useHandCursor: true });
        
        let currentValue = 1.0;
        const minX = 50;
        const maxX = width - 50;

        const updateSlider = (value) => {
            currentValue = Phaser.Math.Clamp(value, param.min, param.max);
            const normalizedPos = (currentValue - param.min) / (param.max - param.min);
            const handleX = minX + normalizedPos * (maxX - minX);
            
            handle.x = handleX;
            fill.x = minX;
            fill.displayWidth = handleX - minX;
            valueText.setText(`${currentValue.toFixed(2)}x`);
            
            this.customPhysics[param.key] = currentValue;
        };

        this.scene.input.on('drag', (pointer, gameObject, dragX) => {
            if (gameObject === handle) {
                const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
                const normalizedPos = (clampedX - minX) / (maxX - minX);
                const newValue = param.min + normalizedPos * (param.max - param.min);
                updateSlider(newValue);
            }
        });

        // Click on track to set value
        track.setInteractive();
        track.on('pointerdown', (pointer) => {
            const localX = pointer.x - container.x - x;
            const clampedX = Phaser.Math.Clamp(localX, minX, maxX);
            const normalizedPos = (clampedX - minX) / (maxX - minX);
            const newValue = param.min + normalizedPos * (param.max - param.min);
            updateSlider(newValue);
        });

        updateSlider(1.0); // Initialize at default

        return { container, param, updateSlider };
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

    selectCar(carId) {
        this.currentCarId = carId;
        const settings = getSessionSettings();
        
        // Get default scheme for this car if not already set
        const schemeId = settings.carId === carId ? settings.schemeId : getDefaultSchemeId(carId);
        this.currentSchemeId = schemeId;

        // Update highlights
        this.updateCarHighlights();
        
        // Update livery options
        this.updateLiveryOptions();
        
        // Update preview
        this.updatePreview();
        
        // Reset physics sliders to default
        this.resetPhysicsSliders();
    }

    updateLiveryOptions() {
        // Clear existing livery buttons
        this.liveryContainer.removeAll(true);
        this.schemeButtons.clear();

        const car = listCarOptions().find(c => c.id === this.currentCarId);
        if (!car) return;

        car.schemes.forEach((scheme, index) => {
            const chip = this.scene.add.rectangle(index * 70, 0, 60, 60, scheme.paint.base, 1)
                .setStrokeStyle(3, scheme.paint.accent, 0.85);

            chip.setInteractive();
            chip.on('pointerover', () => {
                if (this.currentSchemeId !== scheme.id) {
                    chip.setScale(1.1);
                }
            });
            chip.on('pointerout', () => {
                if (this.currentSchemeId !== scheme.id) {
                    chip.setScale(1.0);
                }
            });
            chip.on('pointerdown', () => {
                this.currentSchemeId = scheme.id;
                this.updateLiveryHighlights();
                this.updatePreview();
            });

            const name = this.scene.add.text(index * 70, 38, scheme.name.split(' ')[0], {
                fontFamily: 'Arial',
                fontSize: '11px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5, 0);

            this.liveryContainer.add([chip, name]);
            this.schemeButtons.set(scheme.id, chip);
        });

        this.updateLiveryHighlights();
    }

    updateLiveryHighlights() {
        this.schemeButtons.forEach((chip, schemeId) => {
            if (schemeId === this.currentSchemeId) {
                chip.setStrokeStyle(4, 0xffd700, 1);
                chip.setScale(1.15);
            } else {
                const scheme = getCarScheme(this.currentCarId, schemeId);
                chip.setStrokeStyle(3, scheme.paint.accent, 0.85);
                chip.setScale(1.0);
            }
        });
    }

    updateCarHighlights() {
        this.carCards.forEach(({ bg, car }) => {
            if (car.id === this.currentCarId) {
                bg.setFillStyle(0x1f3a5c, 0.95);
                bg.setStrokeStyle(3, 0xffd966, 0.9);
            } else {
                bg.setFillStyle(0x0d1d32, 0.85);
                bg.setStrokeStyle(2, 0x2570bd, 0.5);
            }
        });
    }

    updatePreview() {
        const car = listCarOptions().find(c => c.id === this.currentCarId);
        if (!car) return;

        this.carPreviewImage.setTexture(`car_${this.currentCarId}_${this.currentSchemeId}`);
        this.selectedCarNameText.setText(car.name);
    }

    resetPhysicsSliders() {
        this.customPhysics = {};
        this.sliders.forEach(slider => {
            slider.updateSlider(1.0);
        });
    }

    loadCurrentSettings() {
        const settings = getSessionSettings();
        this.currentCarId = settings.carId || 'drift';
        this.currentSchemeId = settings.schemeId || getDefaultSchemeId(this.currentCarId);
        this.customPhysics = settings.customPhysics || {};

        this.updateCarHighlights();
        this.updateLiveryOptions();
        this.updatePreview();
        
        // Load custom physics if available
        if (settings.customPhysics) {
            this.sliders.forEach(slider => {
                const value = settings.customPhysics[slider.param.key] || 1.0;
                slider.updateSlider(value);
            });
        }
    }

    applyCustomization() {
        // Save all customization to session state
        setSessionSettings({
            carId: this.currentCarId,
            schemeId: this.currentSchemeId,
            customPhysics: { ...this.customPhysics }
        });

        // Notify parent scene
        if (this.scene.events) {
            this.scene.events.emit('customization-updated');
        }

        this.hide();
    }

    show() {
        this.loadCurrentSettings();
        this.container.setVisible(true);
        this.container.setActive(true);
        this.overlay.setInteractive();
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
