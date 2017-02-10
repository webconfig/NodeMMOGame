(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="../node_modules/@types/socket.io-client/index.d.ts" />
"use strict";
const Game_1 = require("../Common/Game");
const Renderer_1 = require("./graphic/Renderer");
const InputHandler_1 = require("./InputHandler");
const Position_1 = require("./utils/Position");
class GameClient {
    constructor() {
        this.game = new Game_1.Game;
        this.renderer = new Renderer_1.Renderer(() => {
            this.inputHandler = new InputHandler_1.InputHandler(this.renderer.PhaserInput);
            this.socket.emit('clientready');
        });
        setInterval(() => {
            console.log('xx');
            if (this.inputHandler.Changed) {
                let snapshot = this.inputHandler.cloneInputSnapshot();
                let position = snapshot.MoveTo;
                let testString = JSON.stringify(snapshot);
                let snap = eval(testString);
                console.log(snap.MoveTo.X);
            }
        }, 1000);
    }
    connect() {
        this.socket = io.connect();
        if (this.socket != null) {
            this.configureSocket();
        }
    }
    configureSocket() {
        this.socket.on('startgame', this.startGame.bind(this));
        this.socket.on('initializegame', this.initializeGame.bind(this));
    }
    startGame() {
        this.game = new Game_1.Game;
        this.game.startGameLoop();
    }
    initializeGame(initData) {
        let player = this.game.addPlayer(initData.name, new Position_1.Position(initData.x, initData.y));
        this.renderer.addGameObject(player);
        this.renderer.update();
    }
}
exports.GameClient = GameClient;

},{"../Common/Game":9,"./InputHandler":2,"./graphic/Renderer":4,"./utils/Position":8}],2:[function(require,module,exports){
/// <reference path="libs/@types/phaser.d.ts" />
"use strict";
const Position_1 = require("./utils/Position");
class InputSnapshot {
    constructor() {
        this.clear();
    }
    clear() {
        this.keysPressed = [];
        this.keysReleased = [];
        this.keysPressed = null;
    }
    clone() {
        let inputSnapshot = new InputSnapshot;
        inputSnapshot.MoveTo = new Position_1.Position(this.moveTo.X, this.moveTo.Y);
        return inputSnapshot;
    }
    set MoveTo(position) {
        this.moveTo = position;
    }
    get MoveTo() {
        return this.moveTo;
    }
}
exports.InputSnapshot = InputSnapshot;
class InputHandler {
    constructor(phaserInput) {
        // document.addEventListener("keydown", this.keyPressed);
        // document.addEventListener("keyup", this.keyReleased);
        this.inputSnapshot = new InputSnapshot;
        this.changed = false;
        this.phaserInput = phaserInput;
        this.phaserInput.onDown.add(this.mouseClick, this);
        //this.phaserInput.addMoveCallback(this.mouseClick, this);
    }
    keyPressed(event) {
        console.log(event.keyCode);
    }
    keyReleased(event) {
        console.log(event.keyCode);
    }
    mouseClick(mouseEvent) {
        let position = new Position_1.Position(mouseEvent.x, mouseEvent.y);
        this.inputSnapshot.MoveTo = position;
        this.changed = true;
    }
    cloneInputSnapshot() {
        this.changed = false;
        let inputSnapshotCopy = this.inputSnapshot.clone();
        ;
        this.inputSnapshot.clear();
        return inputSnapshotCopy;
    }
    get Changed() {
        return this.changed;
    }
}
exports.InputHandler = InputHandler;

},{"./utils/Position":8}],3:[function(require,module,exports){
/// <reference path="../libs/@types/phaser.d.ts" />
"use strict";
class GameObjectRender {
    constructor(phaserGame) {
        this.phaserGame = phaserGame;
    }
    set GameObject(gameObjectReference) {
        this.objectReference = gameObjectReference;
        let position = this.objectReference.Position;
        this.sprite = this.phaserGame.add.sprite(position.X, position.Y, 'bunny');
        this.sprite.anchor.setTo(0.5, 0.5);
    }
    render() {
        if (this.sprite) {
            let position = this.objectReference.Position;
            this.sprite.x = position.X;
            this.sprite.y = position.Y;
        }
    }
}
exports.GameObjectRender = GameObjectRender;

},{}],4:[function(require,module,exports){
/// <reference path="../libs/@types/phaser.d.ts" />
"use strict";
const GameObjectRender_1 = require("./GameObjectRender");
class Renderer {
    constructor(afterCreateCallback) {
        this.phaserGame = new Phaser.Game(800, 600, Phaser.AUTO, 'content', { preload: this.preload.bind(this), create: this.create.bind(this, afterCreateCallback) });
        this.objectList = new Array();
    }
    preload() {
        this.phaserGame.load.image('bunny', 'resources/images/bunny.png');
        //this.phaserGame.load.onLoadComplete.addOnce(() => { console.log("ASSETS LOAD COMPLETE"); });
    }
    create(afterCreateCallback) {
        //console.log("PHASER CREATE");
        afterCreateCallback();
    }
    update() {
        for (let gameObjectRender of this.objectList) {
            gameObjectRender.render();
        }
    }
    addGameObject(gameObject) {
        let gameObjectRender = new GameObjectRender_1.GameObjectRender(this.phaserGame);
        gameObjectRender.GameObject = gameObject;
        this.objectList.push(gameObjectRender);
    }
    get PhaserInput() {
        return this.phaserGame.input;
    }
}
exports.Renderer = Renderer;

},{"./GameObjectRender":3}],5:[function(require,module,exports){
"use strict";
const GameClient_1 = require("./GameClient");
let client = new GameClient_1.GameClient();
client.connect();

},{"./GameClient":1}],6:[function(require,module,exports){
"use strict";
const Position_1 = require("./Position");
class GameObject {
    constructor(position) {
        if (position) {
            this.position = position;
        }
        else {
            this.position = new Position_1.Position(0, 0);
        }
    }
    get Position() {
        return this.position;
    }
}
exports.GameObject = GameObject;

},{"./Position":8}],7:[function(require,module,exports){
"use strict";
const GameObject_1 = require("./GameObject");
class Player extends GameObject_1.GameObject {
    constructor(name, position) {
        if (position) {
            super(position);
        }
        else {
            super();
        }
        this.name = name;
        this.hp = 100;
    }
    get Name() {
        return this.name;
    }
}
exports.Player = Player;

},{"./GameObject":6}],8:[function(require,module,exports){
"use strict";
class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    get X() {
        return this.x;
    }
    get Y() {
        return this.y;
    }
    set X(x) {
        this.x = x;
    }
    set Y(y) {
        this.y = y;
    }
}
exports.Position = Position;

},{}],9:[function(require,module,exports){
"use strict";
const Player_1 = require("../Client/utils/Player");
class Game {
    constructor() {
        this.tickrate = 60;
        this.players = new Map();
        console.log("create game instance");
    }
    startGameLoop() {
        this.timeoutId = setTimeout(() => this.startGameLoop(), 1 / this.tickrate * 1000);
    }
    stopGameLoop() {
        clearTimeout(this.timeoutId);
    }
    addPlayer(name, position) {
        let player;
        if (position) {
            player = new Player_1.Player(name, position);
        }
        else {
            player = new Player_1.Player(name);
        }
        this.players.set(name, player);
        console.log("New player " + name);
        console.log("Number of players " + this.players.size);
        return player;
    }
}
exports.Game = Game;

},{"../Client/utils/Player":7}]},{},[5]);
