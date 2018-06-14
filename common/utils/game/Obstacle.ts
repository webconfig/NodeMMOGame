import {GameObject} from "./GameObject";
import {Transform} from "../physics/Transform";
import {Result} from "detect-collisions";
import {ChangesDict} from "../../../common/serialize/ChangesDict";

export class Obstacle extends GameObject {

    //private lifeSpan: number = -1;

    constructor(transform: Transform) {
        super(transform);

        transform.Height = 48;
        transform.Width = 48;

        this.SpriteName = "wall";
    }

    protected serverCollision(gameObject: GameObject, result: Result) {
        this.Transform.X -= result.overlap * result.overlap_x;
        this.Transform.Y -= result.overlap * result.overlap_y;

        this.Transform.addChange(ChangesDict.X);
        this.Transform.addChange(ChangesDict.Y);
    }

    protected commonCollision(gameObject: GameObject, result: Result) {

    }

    protected serverUpdate(delta: number) {
        super.serverUpdate(delta);

    }

    protected commonUpdate(delta: number) {
        super.commonUpdate(delta);

        //this.addChange(ChangesDict.POSITION);
    }
}