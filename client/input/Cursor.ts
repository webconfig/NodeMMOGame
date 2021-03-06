import {Transform} from "../../common/utils/physics/Transform";
import {GameObject} from "../../common/utils/game/GameObject";
import {Enemy} from "../../common/utils/game/Enemy";
import {Result} from "detect-collisions";
import {DebugWindowHtmlHandler} from "../graphic/HtmlHandlers/DebugWindowHtmlHandler";

export class Cursor extends GameObject {
    constructor(transform: Transform) {
        super(transform);

        this.invisible = true;
    }

    protected commonUpdate(delta: number) {
        super.commonUpdate(delta);

    }

    protected commonCollision(gameObject: GameObject, result: Result) {
        if(gameObject instanceof Enemy) {
            DebugWindowHtmlHandler.Instance.CursorObjectSpan = (gameObject as Enemy).Name;
        } else {
            DebugWindowHtmlHandler.Instance.CursorObjectSpan = gameObject.SpriteName;
        }
    }
}

