
import { Vec3, Component, Quat } from "cc";
import { quatDivideLeft } from "./QuatDivide";

export function worldToComponentPosition(out: Vec3, worldPosition: Readonly<Vec3>, component: Component) {
    component.node.inverseTransformPoint(out, worldPosition);
    return out;
}

export function componentToWorldPosition(out: Vec3, componentPosition: Readonly<Vec3>, component: Component) {
    return Vec3.transformMat4(out, componentPosition, component.node.worldMatrix);
}

export function worldToComponentRotation(out: Quat, worldRotation: Readonly<Quat>, component: Component) {
    return quatDivideLeft(out, worldRotation, component.node.worldRotation);
}

export function componentToWorldRotation(out: Quat, componentRotation: Readonly<Quat>, component: Component) {
    return Quat.multiply(out, component.node.worldRotation, componentRotation);
}