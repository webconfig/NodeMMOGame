/// <reference path="../node_modules/@types/socket.io-client/index.d.ts" />

import {GameWorld} from "../common/GameWorld";
import {Renderer} from "./graphic/Renderer";
import {InputHandler} from "./input/InputHandler";
import {NetObjectsManager} from "../common/net/NetObjectsManager";
import {GameObjectsFactory} from "../common/utils/game/ObjectsFactory";
import {HeartBeatSender} from "./net/HeartBeatSender";
import {GameObject} from "../common/utils/game/GameObject";
import {SocketMsgs} from "../common/net/SocketMsgs";
import {Chat} from "./Chat";
import {InputSender} from ".//net/InputSender";
import {DeltaTimer} from "../common/DeltaTimer";
import {DebugWindowHtmlHandler} from "./graphic/HtmlHandlers/DebugWindowHtmlHandler";
import {Player} from "../common/utils/game/Player";
import {InputSnapshot} from "../common/input/InputSnapshot";
import {Types} from "../common/utils/game/GameObjectTypes";

import {Cursor} from "./input/Cursor";
import {Transform} from "../common/utils/physics/Transform";

const customParser = require('socket.io-msgpack-parser');
import * as io from "socket.io-client"

export class GameClient {
    private socket: SocketIOClient.Socket;
    private world: GameWorld;
    private chat: Chat;
    private renderer: Renderer;
    private inputHandler: InputHandler;
    private heartBeatSender: HeartBeatSender;
    private inputSender: InputSender;
    private cursor: Cursor;

    private localPlayer: Player = null;
    private localPlayerId: string = "";

    private timer: DeltaTimer = new DeltaTimer;
    private deltaHistory: Array<number> = [];

    private lastSnapshotData: [number, number] = null;

    constructor() {
        this.connect();
        this.inputSender = new InputSender(this.socket);
        this.heartBeatSender = new HeartBeatSender(this.socket);
        this.chat = new Chat(this.socket);

        this.renderer = new Renderer(() => {
            this.socket.emit(SocketMsgs.CLIENT_READY);
        });
    }

    private connect() {
        this.socket = io.connect({
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
            // let worldInfo: Array<string> = data['world'].split(',');
            // let width: number = Number(worldInfo[0]);
            // let height: number = Number(worldInfo[1]);

            this.localPlayerId = data['id'];
            this.world = new GameWorld();
            this.renderer.setMap();
        });

        // this.socket.on(SocketMsgs.LAST_SNAPSHOT_DATA, (lastSnapshotData?: [number, number]) => {
        //     console.log("on LAST_SNAPSHOT_DATA");
        //     this.lastSnapshotData = lastSnapshotData;
        // });

        this.socket.on(SocketMsgs.ERROR, (err: string) => {
            console.log(err);
            alert(err);
        });
    }

    private startGame() {
        this.cursor = GameObjectsFactory.InstatiateManually(new Cursor(new Transform(1,1,1))) as Cursor;
        this.inputHandler = new InputHandler(this.cursor);

        this.inputHandler.addSnapshotCallback(this.inputSender.sendInput.bind(this.inputSender));
        this.inputHandler.addSnapshotCallback((snapshot: InputSnapshot) => {
            if(this.localPlayer) {
                this.localPlayer.setInput(snapshot);
            }
        });

        this.startGameLoop();
    }

    private startGameLoop() {
        let delta: number = this.timer.getDelta();
        this.world.update(delta);

        this.deltaHistory.push(delta);
        if(this.deltaHistory.length > 30) this.deltaHistory.splice(0, 1);
        let deltaAvg: number = 0;
        this.deltaHistory.forEach((delta: number) => {
            deltaAvg += delta;
        });
        deltaAvg /= this.deltaHistory.length;
        DebugWindowHtmlHandler.Instance.Fps = (1000 / deltaAvg).toFixed(2).toString();
        DebugWindowHtmlHandler.Instance.GameObjectCounter = this.world.GameObjectsMapById.size.toString();

        this.renderer.update();

        let deviation: [number, number] = this.renderer.CameraDeviation;
        this.cursor.Transform.X = this.localPlayer.Transform.X + deviation[0];
        this.cursor.Transform.Y = this.localPlayer.Transform.Y + deviation[1];

        requestAnimationFrame(this.startGameLoop.bind(this));
    }

    private removeObjectsUpdate(updateBufferView: DataView, offset: number) {
        // console.log("removeObjectsUpdate ");
        while(offset < updateBufferView.byteLength) {
            let idToRemove: string = String.fromCharCode(updateBufferView.getUint8(offset)) +
                updateBufferView.getUint32(offset + 1).toString();

            let gameObject: GameObject = NetObjectsManager.Instance.getGameObject(idToRemove);
            if (gameObject) {
                gameObject.destroy();
            }
            // console.log("destroy " + idToRemove);
            offset += 5;
        }
    }



    private onServerUpdate(updateBuffer: ArrayBuffer) {
        // if(!updateBuffer) return;
        // updateBuffer = LZString.decompressFromUTF16(updateBuffer);
        // console.log(updateBuffer);
        let updateBufferView: DataView = new DataView(updateBuffer[1]);

        // console.log("on FIRST_UPDATE_GAME " + updateBufferView.byteLength);

        let offset: number = 0;

        let chuj: string = "";
        for(let i = 0; i < updateBufferView.byteLength; i++) {
            chuj += updateBufferView.getUint8(i) + ", ";
        }
        // console.log("CHUJ DUPA " + chuj);

        while(offset < updateBufferView.byteLength) {
            let id: string = String.fromCharCode(updateBufferView.getUint8(offset));

            if(id == String.fromCharCode(255)) {
                // console.log("remove offset " + offset);
                this.removeObjectsUpdate(updateBufferView, offset + 1);
                break;
            }

            id += updateBufferView.getUint32(offset + 1).toString();

            offset += 5;

            let gameObject: GameObject = NetObjectsManager.Instance.getGameObject(id);

            if (gameObject == null) {
                gameObject = GameObjectsFactory.Instatiate(Types.IdToClassNames.get(id[0]), id);
            }

            offset = gameObject.deserialize(updateBufferView, offset);

            if (this.localPlayer && this.localPlayer.ID == id && this.lastSnapshotData != null) {
                this.localPlayer.reconciliation(this.lastSnapshotData, this.world.CollisionsSystem);
                this.lastSnapshotData = null;
            }
        }
    }
}