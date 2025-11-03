// js/texture-factory.js
import { CAR_TYPES } from './car-presets.js';

const CAR_WIDTH = 160;
const CAR_HEIGHT = 72;

export const ensureGameTextures = (scene) => {
    ensureCarTextures(scene);
    ensureWallTexture(scene);
    ensureDirectionArrowTexture(scene);
    ensureTrackArrowTexture(scene);
};

const ensureCarTextures = (scene) => {
    Object.values(CAR_TYPES).forEach((car) => {
        car.schemes.forEach((scheme) => {
            const key = `car_${car.id}_${scheme.id}`;
            if (scene.textures.exists(key)) return;

            const paint = scheme.paint;
            const g = scene.make.graphics({ x: 0, y: 0, add: false });

            g.fillStyle(0x0d0d0d, 1);
            g.fillRoundedRect(0, 0, CAR_WIDTH, CAR_HEIGHT, 22);

            g.fillStyle(paint.base, 1);
            g.fillRoundedRect(6, 8, CAR_WIDTH - 12, CAR_HEIGHT - 16, 18);

            g.fillStyle(paint.secondary, 1);
            g.fillRoundedRect(20, 14, CAR_WIDTH - 40, CAR_HEIGHT - 28, 14);

            drawDecal(g, paint);

            g.fillStyle(0xffffff, 0.92);
            g.fillRoundedRect(CAR_WIDTH - 36, CAR_HEIGHT / 2 - 13, 22, 26, 6);

            g.lineStyle(4, 0xffffff, 0.35);
            g.strokeRoundedRect(6, 8, CAR_WIDTH - 12, CAR_HEIGHT - 16, 18);

            g.generateTexture(key, CAR_WIDTH, CAR_HEIGHT);
            g.destroy();
        });
    });
};

const drawDecal = (graphics, paint) => {
    graphics.lineStyle(0);

    switch (paint.decal) {
        case 'dualStripe':
            graphics.fillStyle(paint.accent, 0.95);
            graphics.fillRoundedRect(CAR_WIDTH * 0.36, 8, 14, CAR_HEIGHT - 16, 12);
            graphics.fillRoundedRect(CAR_WIDTH * 0.50, 8, 14, CAR_HEIGHT - 16, 12);
            break;

        case 'katana':
            graphics.fillStyle(paint.accent, 0.85);
            graphics.beginPath();
            graphics.moveTo(30, CAR_HEIGHT - 18);
            graphics.lineTo(CAR_WIDTH - 18, 18);
            graphics.lineTo(CAR_WIDTH - 26, 12);
            graphics.lineTo(22, CAR_HEIGHT - 24);
            graphics.closePath();
            graphics.fillPath();
            break;

        case 'speedChevron':
            graphics.fillStyle(paint.accent, 0.88);
            graphics.beginPath();
            graphics.moveTo(CAR_WIDTH * 0.38, 12);
            graphics.lineTo(CAR_WIDTH * 0.82, CAR_HEIGHT / 2);
            graphics.lineTo(CAR_WIDTH * 0.38, CAR_HEIGHT - 12);
            graphics.closePath();
            graphics.fillPath();
            break;

        case 'enduranceBadge':
            graphics.fillStyle(0x103b1a, 0.92);
            graphics.fillRoundedRect(32, 18, CAR_WIDTH - 64, CAR_HEIGHT - 36, 10);
            graphics.lineStyle(4, paint.accent, 0.85);
            graphics.strokeRoundedRect(34, 20, CAR_WIDTH - 68, CAR_HEIGHT - 40, 10);
            break;

        default:
            break;
    }
};

const ensureWallTexture = (scene) => {
    if (scene.textures.exists('wallTexture')) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 120, 36);
    g.generateTexture('wallTexture', 120, 36);
    g.destroy();
};

const ensureDirectionArrowTexture = (scene) => {
    if (scene.textures.exists('dirArrow')) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 48, h = 54;
    g.fillStyle(0x00d4ff, 0.95);
    g.beginPath();
    g.moveTo(w / 2, 2);
    g.lineTo(w - 6, h - 8);
    g.lineTo(w / 2, h - 18);
    g.lineTo(6, h - 8);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.85);
    g.beginPath();
    g.moveTo(w / 2, h - 16);
    g.lineTo(w / 2, 8);
    g.strokePath();
    g.generateTexture('dirArrow', w, h);
    g.destroy();
};

const ensureTrackArrowTexture = (scene) => {
    if (scene.textures.exists('trackArrow')) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const w = 180, h = 64;
    g.fillStyle(0xffd53d, 0.85);
    g.beginPath();
    g.moveTo(10, h / 2 - 12);
    g.lineTo(w - 42, h / 2 - 12);
    g.lineTo(w - 42, 8);
    g.lineTo(w - 8, h / 2);
    g.lineTo(w - 42, h - 8);
    g.lineTo(w - 42, h / 2 + 12);
    g.lineTo(10, h / 2 + 12);
    g.closePath();
    g.fillPath();

    g.lineStyle(6, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(16, h / 2);
    g.lineTo(w - 48, h / 2);
    g.strokePath();

    g.generateTexture('trackArrow', w, h);
    g.destroy();
};