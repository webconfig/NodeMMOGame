import {GameObject} from "../utils/game/GameObject";
import {GameObjectsSubscriber} from "../utils/factory/GameObjectsSubscriber";
import {CommonConfig} from "../CommonConfig";
import {CollisionsSystem} from "../utils/physics/CollisionsSystem";
import {Player} from "../utils/game/Player";
import {GameObjectsFactory} from "../utils/factory/ObjectsFactory";
import {Types} from "../utils/factory/GameObjectTypes";
import {Chunk, ChunksManager} from "../utils/Chunks";

export class NetObjectsSerializer extends GameObjectsSubscriber {
    private static DESTROY_OBJECTS_ID = 255;

    private destroyedObjects: Map<Chunk, Array<string> >;
    private chunksManager: ChunksManager;

    constructor(chunksManager: ChunksManager) {
        super();

        this.chunksManager = chunksManager;

        if(CommonConfig.IS_SERVER) {
            this.destroyedObjects = new Map<Chunk, Array<string>>();

            let chunks: Chunk[][] = this.chunksManager.Chunks;
            for(let i = 0; i < chunks.length; i++) {
                for(let j = 0; j < chunks[i].length; j++) {
                    this.destroyedObjects.set(chunks[i][j], []);
                }
            }
        }
    }

    protected onObjectDestroy(gameObject: GameObject) {
        if(CommonConfig.IS_SERVER) {
            let chunk: Chunk = this.chunksManager.getChunkByCoords(gameObject.Transform.X, gameObject.Transform.Y);

            if(!chunk) {
                // console.log("WARNING! destroyed object that doesn't belong to any chunk");
                return;
            }

            this.destroyedObjects.get(chunk).push(gameObject.ID);
        }
    }

    public collectObjectUpdate(gameObject: GameObject): DataView {
        let objectNeededSize = gameObject.calcNeededBufferSize(true) + 5;
        let updateBuffer: ArrayBuffer = new ArrayBuffer(objectNeededSize );
        let updateBufferView: DataView = new DataView(updateBuffer);

        updateBufferView.setUint8(0, gameObject.ID.charCodeAt(0));
        updateBufferView.setUint32(1, Number(gameObject.ID.slice(1)));
        gameObject.serialize(updateBufferView, 5, true);

        return updateBufferView;
    }

    //获取状态变更
    public collectUpdate(complete: boolean = false): Map<Chunk, ArrayBuffer> {
        let chunksUpdate: Map<Chunk, ArrayBuffer> = new Map<Chunk, ArrayBuffer>();

        let chunks: Chunk[][] = this.chunksManager.Chunks;
        for(let i = 0; i < chunks.length; i++) {
            for (let j = 0; j < chunks[i].length; j++) {//便利所有块
                let chunk: Chunk = chunks[i][j];
                //不需要从没有玩家的区域发送更新
                if (!chunk.HasPlayersInNeighborhood) {
                    continue;
                }

                //有新的玩家加入该区域，向他发送改区域所有的物体状态
                let chunkCompleteUpdate: boolean = complete || chunk.HasNewcomersInNeighborhood;
                let neededBufferSize: number = 0;//需要发送的字节数
                let objectsToUpdateMap: Map<GameObject, number> = new Map<GameObject, number>();

                chunk.Objects.forEach((gameObject: GameObject) => {//便利区域内所有物体
                    let neededSize = gameObject.calcNeededBufferSize(chunkCompleteUpdate);
                    if (neededSize > 0) {
                        objectsToUpdateMap.set(gameObject, neededBufferSize);
                        //need 5 bits for obj ID
                        neededBufferSize += neededSize + 5;
                    }
                });

                let destrotObjectsOffset: number = neededBufferSize;

                if (this.destroyedObjects.get(chunk).length > 0) {
                    neededBufferSize += (this.destroyedObjects.get(chunk).length * 5) + 1;
                }

                let updateBuffer: ArrayBuffer = new ArrayBuffer(neededBufferSize);
                let updateBufferView: DataView = new DataView(updateBuffer);

                objectsToUpdateMap.forEach((offset: number, gameObject: GameObject) => {
                    updateBufferView.setUint8(offset, gameObject.ID.charCodeAt(0));
                    updateBufferView.setUint32(offset + 1, Number(gameObject.ID.slice(1)));

                    gameObject.serialize(updateBufferView, offset + 5, chunkCompleteUpdate);
                });

                if (this.destroyedObjects.get(chunk).length > 0) {
                    updateBufferView.setUint8(destrotObjectsOffset++, NetObjectsSerializer.DESTROY_OBJECTS_ID);
                    this.destroyedObjects.get(chunk).forEach((id: string) => {
                        updateBufferView.setUint8(destrotObjectsOffset, id.charCodeAt(0));
                        updateBufferView.setUint32(destrotObjectsOffset + 1, Number(id.slice(1)));
                        destrotObjectsOffset += 5;
                    });
                }

                this.destroyedObjects.set(chunk, []);
                chunksUpdate.set(chunk, updateBuffer);
            }
        }

        return chunksUpdate;
    }

    //TODO move localPlayer and reconciliation somewhere else
    public decodeUpdate(updateBufferView: DataView, localPlayer: Player, collisionsSystem: CollisionsSystem) {
        let offset: number = 0;

        while(offset < updateBufferView.byteLength) {
            let id: string = String.fromCharCode(updateBufferView.getUint8(offset));

            if(id == String.fromCharCode(NetObjectsSerializer.DESTROY_OBJECTS_ID)) {
                offset = this.decodeDestroyedObjects(updateBufferView, offset + 1);
                break;
            }

            id += updateBufferView.getUint32(offset + 1).toString();//获取玩家id

            offset += 5;

            let gameObject: GameObject = this.getGameObject(id);

            if (gameObject == null) {
                gameObject = GameObjectsFactory.Instatiate(Types.IdToClassNames.get(id[0]), id);
            }

            offset = gameObject.deserialize(updateBufferView, offset);

            if (localPlayer && localPlayer.ID == id) {
                localPlayer.reconciliation(collisionsSystem);
            }
        }
    }

    private decodeDestroyedObjects(updateBufferView: DataView, offset: number) {
        while(offset < updateBufferView.byteLength) {
            let idToRemove: string = String.fromCharCode(updateBufferView.getUint8(offset)) +
                updateBufferView.getUint32(offset + 1).toString();

            let gameObject: GameObject = this.getGameObject(idToRemove);
            if (gameObject) {
                gameObject.destroy();
            }
            offset += 5;
        }

        return offset;
    }
}