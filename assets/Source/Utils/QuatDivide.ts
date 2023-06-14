import { Quat } from "cc";

export const quatDivideLeft = (() => {
    const cacheInv = new Quat();
    return (out: Quat, dividend: Readonly<Quat>, divisor: Readonly<Quat>) => {
        // dividend = divisor * result
        // inv(divisor) * dividend = result
        const invDivisor = Quat.invert(cacheInv, divisor);
        return Quat.multiply(out, invDivisor, dividend);
    };
})();

export const quatDivideRight = (() => {
    const cacheInv = new Quat();
    return (out: Quat, dividend: Readonly<Quat>, divisor: Readonly<Quat>) => {
        // dividend = result * divisor
        // dividend * inv(divisor) = result
        const invDivisor = Quat.invert(cacheInv, divisor);
        return Quat.multiply(out, dividend, invDivisor);
    };
})();