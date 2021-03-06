import {Transform} from "../physics/Transform";
import {ChangesDict} from "../../serialize/ChangesDict";
import {CommonConfig} from "../../CommonConfig";
import {Serializable, SerializableTypes} from "../../serialize/Serializable";
import {NetworkObject, NetworkProperty} from "../../serialize/NetworkDecorators";
import {Result} from "detect-collisions";
import {ResourcesMap} from "../ResourcesMap";

export class GameObject extends Serializable {
    protected id: string = "";
    protected spriteName: string;
    @NetworkObject("pos")
    protected transform: Transform;

    @NetworkProperty(ChangesDict.VELOCITY, SerializableTypes.Float32)
    protected velocity: number = 0;

    @NetworkProperty("INV", SerializableTypes.Uint8)
    protected invisible: boolean = false;

    private destroyListeners: Set<Function>;

    private isDestroyed: boolean = false;

    constructor(transform: Transform) {
        super();
        this.transform = transform;

        this.SpriteName  = "none";
        this.destroyListeners = new Set<Function>();
    }

    onCollisionEnter(gameObject: GameObject, result: Result) {
        if(CommonConfig.IS_SERVER) {
            this.serverCollision(gameObject, result);
        }
        this.commonCollision(gameObject, result);
    }

    protected serverCollision(gameObject: GameObject, result: Result) {

    }

    protected commonCollision(gameObject: GameObject, result: Result) {

    }

    public forceCompleteUpdate() {
        this.forceComplete = true;
    }

    //物体帧更新
    public update(delta: number) {
        if(CommonConfig.IS_SERVER) {
            this.serverUpdate(delta);
        }
        this.commonUpdate(delta);
    }

    protected commonUpdate(delta: number)  {
    }

    protected serverUpdate(delta: number)  {

    }

    addDestroyListener(listener: Function) {
        this.destroyListeners.add(listener)
    }

    removeDestroyListener(listener: Function) {
        this.destroyListeners.delete(listener);
    }

    destroy() {
        if(this.isDestroyed) {
            return;
        }

        for(let listener of this.destroyListeners) {
            listener(this);
        }
        this.isDestroyed = true;
    }

    get Transform(): Transform {
        return this.transform;
    }

    get ID(): string {
        return this.id;
    }

    get Velocity(): number {
        return this.velocity;
    }

    set Velocity(val: number) {
        this.velocity = val;
    }

    set ID(id: string) {
        this.id = id;
    }

    get SpriteName(): string {
        return this.spriteName;
    }

    set SpriteName(spriteName: string) {
        this.spriteName = spriteName;
        this.addChange(ChangesDict.SPRITE_ID);
    }

    @NetworkProperty(ChangesDict.SPRITE_ID, SerializableTypes.Uint16)
    set SpriteId(id: number) {
        this.spriteName = ResourcesMap.IdToName.get(id);
    }

    get SpriteId(): number {
        return ResourcesMap.NameToId.get(this.spriteName);
    }

    get Invisible(): boolean {
        return this.invisible;
    }

    get IsDestroyed(): boolean {
        return this.isDestroyed;
    }
}