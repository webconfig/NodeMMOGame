import {Serializable, SerializableTypes} from "./Serializable";

export namespace PropNames {
    export const SerializeFunctions:    string = "SerializeFunctions";
    export const DeserializeFunctions:  string = "DeserializeFunctions";
    export const CalcBytesFunctions:    string = "CalcBytesFunctions";
    export const SerializeEncodeOrder:  string = "SerializeEncodeOrder";
    export const SerializeDecodeOrder:  string = "SerializeDecodeOrder";
    export const PropertyTypes:         string = "PropertyType";
    export const DecodeCounter:         string = "DecodeCounter";
    export const NestedNetworkObjects:  string = "NestedNetworkObjects";
}

function fillString(str: string, view: DataView, offset: number) {
    view.setUint8(offset, str.length);
    for(let i = 0; i < str.length; i++) {
        view.setUint8(offset + i + 1, str.charCodeAt(i));
    }
}

function decodeString(view: DataView, offset: number): string {
    let len: number = view.getUint8(offset);

    let str: string = "";
    for(let i = 1; i <= len; i++) {
        str += String.fromCharCode(view.getUint8(i + offset));
    }
    return str;
}

export function NetworkProperty(shortKey: string, type: SerializableTypes) {
    function decorator(target: Object, key: string) {
        addNetworkProperties(target);

        let counter: number = target[PropNames.DecodeCounter]++;
        target[PropNames.SerializeEncodeOrder].set(shortKey, counter);
        target[PropNames.SerializeDecodeOrder].set(counter, shortKey);

        target[PropNames.PropertyTypes].set(shortKey, type);

        target[PropNames.SerializeFunctions].set(shortKey, (object: Serializable, view: DataView, offset: number) => {//序列化
            console.log('NetworkProperty-->SerializeFunctions-->:'+shortKey);
            let type: SerializableTypes = object[PropNames.PropertyTypes].get(shortKey);

            if(type == SerializableTypes.String) {
                fillString(object[key], view, offset);
                return (object[key] as string).length + 1;
            } else if(type == SerializableTypes.Int8) {
                view.setInt8(offset, object[key]);
            } else if(type == SerializableTypes.Int16) {
                view.setInt16(offset, object[key]);
            } else if(type == SerializableTypes.Int32) {
                view.setInt32(offset, object[key]);
            } else if(type == SerializableTypes.Uint8) {
                view.setUint8(offset, object[key]);
            } else if(type == SerializableTypes.Uint16) {
                view.setUint16(offset, object[key]);
            } else if(type == SerializableTypes.Uint32) {
                view.setUint32(offset, object[key]);
            } else if(type == SerializableTypes.Float32) {
                view.setFloat32(offset, object[key]);
            } else if(type == SerializableTypes.Float64) {
                view.setFloat64(offset, object[key]);
            }

            return Serializable.TypesToBytesSize.get(type);
        });

        target[PropNames.DeserializeFunctions].set(shortKey, (object: Serializable, view: DataView, offset: number): number => {//反序列化
            if(type == SerializableTypes.String) {
                object[key] = decodeString(view, offset);
                return (object[key] as string).length + 1;
            } else if(type == SerializableTypes.Int8) {
                let k=view.getInt8(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Int16) {
                let k=view.getInt16(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Int32) {
                let k=view.getInt32(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Uint8) {
                let k=view.getUint8(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Uint16) {
                let k=view.getUint16(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Uint32) {
                let k=view.getUint32(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Float32) {
                let k=view.getFloat32(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            } else if(type == SerializableTypes.Float64) {
                let k=view.getFloat64(offset);
                object[key] = k;
                console.log('key:'+key+'old:'+object[key]+'---'+k+"--"+object[key]);
            }

            return Serializable.TypesToBytesSize.get(type);
        });

        target[PropNames.CalcBytesFunctions].set(shortKey, (object: Serializable, complete: boolean): number => {
            let type: SerializableTypes = target[PropNames.PropertyTypes].get(shortKey);

            if(type == SerializableTypes.String) {
                return (object[key] as string).length + 1;
            } else if(type == SerializableTypes.Object) {
                return (object[key] as Serializable).calcNeededBufferSize(complete);
            } else {
                return Serializable.TypesToBytesSize.get(type);
            }
        });
    }

    return decorator;
}

export function NetworkObject(shortKey: string) {
    function decorator(target: Object, key: string) {
        addNetworkProperties(target);

        target[PropNames.PropertyTypes].set(shortKey, SerializableTypes.Object);

        let counter: number = target[PropNames.DecodeCounter]++;

        target[PropNames.SerializeEncodeOrder].set(shortKey, counter);
        target[PropNames.SerializeDecodeOrder].set(counter, shortKey);
        target[PropNames.NestedNetworkObjects].set(shortKey, key);
    }

    return decorator;
}

function addNetworkProperties(target: Object) {
    createMapProperty<string, Function>(target, PropNames.SerializeFunctions);
    createMapProperty<string, Function>(target, PropNames.DeserializeFunctions);
    createMapProperty<string, Function>(target, PropNames.CalcBytesFunctions);
    createMapProperty<string, number>(target, PropNames.SerializeEncodeOrder);
    createMapProperty<number, string>(target, PropNames.SerializeDecodeOrder);
    createMapProperty<string, SerializableTypes>(target, PropNames.PropertyTypes);
    createMapProperty<string, number>(target, PropNames.NestedNetworkObjects);

    addDcecodeCounter(target);
}


function createMapProperty<T, R>(target: Object, propertyName: string) {
    if (!target.hasOwnProperty(propertyName)) {
        let propertyVal: Map<T, R> = getPrototypePropertyVal(target, propertyName, null);
        propertyVal = new Map<T, R>(propertyVal);
        createProperty(target, propertyName, propertyVal);
    }
}

function createProperty(target: Object, propertyName: string, propertyVal: any) {
    Object.defineProperty(target, propertyName, {
        value: propertyVal,
        writable: true,
        enumerable: true,
        configurable: true
    });
}

function addDcecodeCounter(target: Object) {
    if (!target.hasOwnProperty(PropNames.DecodeCounter)) {
        let propertyVal: number = getPrototypePropertyVal(target, PropNames.DecodeCounter, 0);
        createProperty(target, PropNames.DecodeCounter, propertyVal);
    }
}

function getPrototypePropertyVal(target: Object, propertyName: string, defaultVal: any) {
    let basePrototype: any = target;

    while (basePrototype) {
        let prototype: any = Object.getPrototypeOf(basePrototype);
        basePrototype = prototype;

        if (basePrototype && prototype.hasOwnProperty(propertyName)) {
            return prototype[propertyName]
        }
    }

    return defaultVal;
}
