import { Quat, Vec3, clamp01 } from "cc";

export function lerpTo(out: Vec3, from: Readonly<Vec3>, to: Readonly<Vec3>, speed: number, deltaTime: number) {
    const dir = Vec3.subtract(new Vec3(), from, to);
    const d = Vec3.len(dir);
    if (d < 1e-5) {
        return Vec3.copy(out, to);
    }
    return Vec3.lerp(out, from, to, clamp01(speed * deltaTime / d));
}

export function quatLerpTo(out: Quat, from: Readonly<Quat>, to: Readonly<Quat>, speed: number, deltaTime: number) {
    const angle = Quat.angle(from, to);
    if (angle < 1e-5) {
        return Quat.copy(out, to);
    }
    return Quat.slerp(out, from, to, clamp01(speed * deltaTime / angle));
}
