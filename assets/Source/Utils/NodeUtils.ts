
import * as cc from 'cc';

export function getForward (node: cc.Node) {
    return cc.math.Vec3.transformQuat(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z, node.worldRotation);
}
