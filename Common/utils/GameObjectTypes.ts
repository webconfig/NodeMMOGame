/**
 * Created by Tomek on 2017-04-08.
 */

export enum GameObjectType {
    GameObject = <any>'G',
    Player = <any>'P'
}

export let TypeIdMap: Map<string, GameObjectType> = new Map<string, GameObjectType>();

TypeIdMap.set('G', GameObjectType.GameObject);
TypeIdMap.set('P', GameObjectType.Player);