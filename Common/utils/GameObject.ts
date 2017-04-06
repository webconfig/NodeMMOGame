import {Position} from "./Position";

export abstract class GameObject {
    protected position: Position;

    constructor(position?: Position) {
        if (position) {
            this.position = position;
        } else {
            this.position = new Position(0, 0);
        }

    }

    get Position(): Position {
        return this.position;
    }

    serialize(): string {
        let position: string = '#P:' + this.position.X.toString() + ',' + this.position.Y.toString();

        let update: string = position;
        return update;
    }

    deserialize(update: string[]) {
        for(let item of update) {
            console.log(item);
            if(item.startsWith('P')) {
                this.updatePosition(item.split(':')[1]);
            }
        }
    }

    private updatePosition(data: string) {
        console.log(data);
        let x: string = data.split(',')[0];
        let y: string = data.split(',')[1];

        this.position.X = parseFloat(x);
        this.position.Y = parseFloat(y);
    }
}