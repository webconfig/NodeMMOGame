/// <reference path="../node_modules/@types/socket.io-client/index.d.ts" />

import {GameWorld} from "../common/GameWorld";
import {Renderer} from "./graphic/Renderer";
import {InputHandler} from "./input/InputHandler";
import {NetObjectsSerializer} from "../common/serialize/NetObjectsSerializer";
import {GameObjectsFactory} from "../common/utils/factory/ObjectsFactory";
import {HeartBeatSender} from "./net/HeartBeatSender";
import {SocketMsgs} from "../common/net/SocketMsgs";
import {Chat} from "./Chat";
import {InputSender} from ".//net/InputSender";
import {DeltaTimer} from "../common/DeltaTimer";
import {DebugWindowHtmlHandler} from "./graphic/HtmlHandlers/DebugWindowHtmlHandler";
import {Player} from "../common/utils/game/Player";
import {InputSnapshot} from "../common/input/InputSnapshot";
import {Cursor} from "./input/Cursor";
import {Transform} from "../common/utils/physics/Transform";

const customParser = require('socket.io-msgpack-parser');
// import * as io from "socket.io-client"
const io = require('socket.io-client');
export class GameClient {
    private socket: SocketIOClient.Socket;
    private world: GameWorld;
    private chat: Chat;
    private renderer: Renderer;
    private inputHandler: InputHandler;
    private heartBeatSender: HeartBeatSender;
    private inputSender: InputSender;
    private cursor: Cursor;

    private netObjectsSerializer: NetObjectsSerializer = null;

    private localPlayer: Player = null;
    private localPlayerId: string = "";

    private timer: DeltaTimer = new DeltaTimer;
    private deltaHistory: Array<number> = [];

    constructor() {
        //游戏开始位置
        this.connect();
        this.inputSender = new InputSender(this.socket);
        this.heartBeatSender = new HeartBeatSender(this.socket);
        this.chat = new Chat(this.socket);

        this.renderer = new Renderer(() => {
            this.renderer.createHUD();
            this.socket.emit(SocketMsgs.CLIENT_READY);
        });
    }

    private connect() {
        this.socket = io({
                reconnection: false,
                parser: customParser
            });

        if(this.socket != null) {
            this.configureSocket();
        } else {
            throw new Error("Cannot connect to server")
        }
    }

    private configureSocket() {
        this.socket.on(SocketMsgs.FIRST_UPDATE_GAME, (data) => {
            console.log("on FIRST_UPDATE_GAME");
            this.onServerUpdate(data);

            this.localPlayer = this.world.getGameObject(this.localPlayerId) as Player;
            this.renderer.CameraFollower = this.localPlayer;
            this.heartBeatSender.sendHeartBeat();

            this.startGame();
            this.socket.on(SocketMsgs.UPDATE_GAME, this.onServerUpdate.bind(this));

        });
        this.socket.on(SocketMsgs.INITIALIZE_GAME, (data) => {
            console.log("on INITIALIZE_GAME");

            this.localPlayerId = data['id'];
            this.world = new GameWorld();
            this.netObjectsSerializer = new NetObjectsSerializer(this.world.ChunksManager);
            this.renderer.setMap();

            this.cursor = GameObjectsFactory.InstatiateManually(new Cursor(new Transform(1,1,1))) as Cursor;
            this.inputHandler = new InputHandler(this.cursor);

            this.inputHandler.addSnapshotCallback(this.inputSender.sendInput.bind(this.inputSender));//发送用户输入到服务器
            this.inputHandler.addSnapshotCallback((snapshot: InputSnapshot) => {
                if(this.localPlayer) {
                    this.localPlayer.setInput(snapshot);//本地预先处理用户输入
                }
            });
        });

        this.socket.on(SocketMsgs.LAST_SNAPSHOT_DATA, (lastSnapshotData?: [number, number]) => {
            if(this.localPlayer) {
                this.localPlayer.LastServerSnapshotData = lastSnapshotData;
            }
        });

        this.socket.on(SocketMsgs.ERROR, (err: string) => {
            console.log(err);
            // alert(err);
        });
    }

    private startGame() {
        this.startGameLoop();
    }

    private startGameLoop() {
        let delta: number = this.timer.getDelta();
        this.world.update(delta);
        this.world.ChunksManager.clearUnusedChunks(this.localPlayer);

        this.deltaHistory.push(delta);
        if(this.deltaHistory.length > 30) this.deltaHistory.splice(0, 1);
        let deltaAvg: number = 0;
        this.deltaHistory.forEach((delta: number) => {
            deltaAvg += delta;
        });
        deltaAvg /= this.deltaHistory.length;
        DebugWindowHtmlHandler.Instance.Fps = (1000 / deltaAvg).toFixed(2).toString();
        DebugWindowHtmlHandler.Instance.GameObjectCounter = this.world.GameObjectsMapById.size.toString();
        DebugWindowHtmlHandler.Instance.Position = "x: " + this.localPlayer.Transform.X.toFixed(2) +
            " y: " + this.localPlayer.Transform.Y.toFixed(2);

        this.renderer.update();

        let deviation: [number, number] = this.renderer.CameraDeviation;
        this.cursor.Transform.X = this.localPlayer.Transform.X + deviation[0];
        this.cursor.Transform.Y = this.localPlayer.Transform.Y + deviation[1];

        requestAnimationFrame(this.startGameLoop.bind(this));
    }

    private onServerUpdate(updateBuffer: Array<ArrayBuffer> | ArrayBuffer) {
        // nasty hack to satisfy typescript compiler (dont know how to fix it xD)
        // socket update may come as [0, ArrayBuffer] or [0, [0, ArrayBuffer], ..., [0, ArrayBuffer]]
        if(updateBuffer[0] instanceof Array) {
            if(updateBuffer instanceof Array) {
                for (let i = 0; i < updateBuffer.length; i++) {
                    let updateBufferView: DataView = new DataView(updateBuffer[i][1]);
                    this.netObjectsSerializer.decodeUpdate(updateBufferView, this.localPlayer, this.world.CollisionsSystem);
                }
            }
        } else {
            let updateBufferView: DataView = new DataView(updateBuffer[1]);
            this.netObjectsSerializer.decodeUpdate(updateBufferView, this.localPlayer, this.world.CollisionsSystem);
        }
    }
}