/// <reference path="../libs/@types/phaser.d.ts" />

import {InputSnapshot} from "../../Common/input/InputSnapshot";
import {Position} from "../../Common/utils/game/Position";
import {InputMap, INPUT} from "./InputMap";

export class InputHandler {
    private phaserInput: Phaser.Input;

    private releasedKeys: Set<number>;
    private clickPosition: Position;
    private lastDirection: number = 0;

    private snapshotCallbacks: Array<Function>;
    private pressedKeys: Set<number>;

    private static SnapshotId: number = 0;

    constructor(phaserInput: Phaser.Input) {
        this.pressedKeys =  new Set<number>();
        this.releasedKeys =  new Set<number>();
        this.clickPosition = null;

        this.snapshotCallbacks = new Array<Function>();

        document.addEventListener("keydown", this.keyPressed.bind(this));
        document.addEventListener("keyup", this.keyReleased.bind(this));

        this.phaserInput = phaserInput;
        this.phaserInput.onDown.add(this.mouseClick, this);
    }

    public addSnapshotCallback(callback: Function) {
        this.snapshotCallbacks.push(callback);
    }


    private keyPressed(event : KeyboardEvent) {
        if(InputMap.has(event.keyCode) && !this.pressedKeys.has(event.keyCode)) {
            this.releasedKeys.delete(event.keyCode);
            this.pressedKeys.add(event.keyCode);
            this.serializeSnapshot();
        }
    }

    private keyReleased(event : KeyboardEvent) {
        if(InputMap.has(event.keyCode) && this.pressedKeys.has(event.keyCode)) {
            this.pressedKeys.delete(event.keyCode);
            this.releasedKeys.add(event.keyCode);
            this.serializeSnapshot();
        }
    }

    private mouseClick(mouseEvent: MouseEvent) {
        this.clickPosition = new Position(mouseEvent.x, mouseEvent.y);
        this.serializeSnapshot();
    }

    public serializeSnapshot() {
            let snapshot: InputSnapshot = this.createInputSnapshot();
            let serializedSnapshot = JSON.stringify(snapshot);
            if(serializedSnapshot.length == 0) {
                return;
            }

            let id: number = InputHandler.SnapshotId++;

            this.snapshotCallbacks.forEach((callback: Function) => {
                callback(id, snapshot);
            });
    }

    private createInputSnapshot(): InputSnapshot {
        let inputSnapshot: InputSnapshot = new InputSnapshot;

        let directionBuffor: Array<INPUT> = new Array<INPUT>(4);
        let inputPressed: Set<INPUT> = new Set<INPUT>();
        this.pressedKeys.forEach((key: number) => {
            let input: INPUT = InputMap.get(key);

            if(input == INPUT.UP || input == INPUT.DOWN || input == INPUT.LEFT || input == INPUT.RIGHT) {
                directionBuffor.push(input);
            } else {
                inputPressed.add(input);
            }
        });

        let newDirection: number = this.parseDirection(directionBuffor);
        if(newDirection != this.lastDirection) {
            this.lastDirection = newDirection;
            inputSnapshot.append("D", newDirection.toString())
        }

        if(this.clickPosition != null) {
            inputSnapshot.append("C", this.clickPosition.X.toString() + ";" + this.clickPosition.Y.toString())
            this.clickPosition = null;
        }

        this.releasedKeys.clear();

        return inputSnapshot;
    }

    private parseDirection(directionBuffor: Array<INPUT>): number {
        let direction: number = 0;
        if(directionBuffor.indexOf(INPUT.UP) != -1 && directionBuffor.indexOf(INPUT.RIGHT) != -1) {
            direction = 2;
        } else if(directionBuffor.indexOf(INPUT.DOWN) != -1 && directionBuffor.indexOf(INPUT.RIGHT) != -1) {
            direction = 4;
        } else if(directionBuffor.indexOf(INPUT.DOWN) != -1 && directionBuffor.indexOf(INPUT.LEFT) != -1) {
            direction = 6;
        } else if(directionBuffor.indexOf(INPUT.UP) != -1 && directionBuffor.indexOf(INPUT.LEFT) != -1) {
            direction = 8;
        } else if(directionBuffor.indexOf(INPUT.UP) != -1) {
            direction = 1;
        } else if(directionBuffor.indexOf(INPUT.RIGHT) != -1) {
            direction = 3;
        } else if(directionBuffor.indexOf(INPUT.LEFT) != -1) {
            direction = 7;
        } else if(directionBuffor.indexOf(INPUT.DOWN) != -1) {
            direction = 5;
        }

        return direction
    }
}