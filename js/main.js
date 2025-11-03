// js/main.js
import { MenuScene } from './scenes/menu-scene.js';
import { GameScene } from './scenes/game-scene.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'gameContainer',
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene]
};

new Phaser.Game(config);