export enum Origin {
    CLIENT,
    SERVER,
    UNKNOWN
}

function getOrigin(): Origin {
    if(typeof window !== 'undefined') {
        return Origin.CLIENT;
    } else {
        return Origin.SERVER;
    }
}

export class CommonConfig {
    public static chunkSize: number = 800;
    //可活动区域x
    public static numOfChunksX: number = 4;
    //可活动区域y
    public static numOfChunksY: number = 4;

    public static ORIGIN: Origin = getOrigin();

    public static get IS_SERVER(): boolean {
        return CommonConfig.ORIGIN == Origin.SERVER;
    }

    public static get IS_CLIENT(): boolean {
        return CommonConfig.ORIGIN == Origin.CLIENT;
    }
}