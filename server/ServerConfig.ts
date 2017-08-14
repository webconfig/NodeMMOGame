export class ServerConfig {
    public static TICKRATE = 1 / 64 * 1000;
    public static CLIENT_TIMEOUT = 5000; //time in ms
    public static UPDATE_INTERVAL = 1 / 30 * 1000; //updates interval in ms (ex. 1 / 20 * 1000 => 20 updates per secound)
    public static DISCONNECT_CHECK_INTERVAL = 1000; //time in ms
}