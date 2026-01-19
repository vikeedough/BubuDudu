declare module "upng-js" {
    const UPNG: {
        decode(buffer: ArrayBuffer): any;
        toRGBA8(png: any): Uint8Array[];
    };
    export default UPNG;
}
