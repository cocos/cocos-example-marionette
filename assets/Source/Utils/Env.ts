
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
    return (('ontouchstart' in globalThis) ||
        (globalThis.navigator.maxTouchPoints > 0) ||
        (globalThis.navigator.msMaxTouchPoints > 0));
}