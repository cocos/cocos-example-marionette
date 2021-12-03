import { sys } from "cc";

declare global {
    namespace globalThis {
        interface Navigator {
            msMaxTouchPoints: number;
        }
    }
}

export function useMouseInput() {
    return !isTouchDevice();
}

function isTouchDevice() {
    return sys.hasFeature(sys.Feature.INPUT_TOUCH);
}