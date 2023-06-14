import { _decorator, Component, Node, Quat, randomRange, toRadian, Vec3 } from 'cc';
import { lerpTo, quatLerpTo } from '../../Source/Utils/LerpTo';
const { ccclass, property } = _decorator;

@ccclass('LCDSurfaceMover')
export class LCDSurfaceMover extends Component {
    @property(Node)
    lcd: Node | null = null;

    @property
    moveSpeed = 1.0;

    start() {
        this._updateTargetPosition();
        this.node.worldPosition = this._targetPosition;
    }

    update(deltaTime: number) {
        if (Vec3.distance(this.node.worldPosition, this._targetPosition) < 1e-5) {
            this._updateTargetPosition();
        }

        this.node.worldPosition = lerpTo(
            new Vec3(), this.node.worldPosition, this._targetPosition, this.moveSpeed, deltaTime);
        const dir = Vec3.subtract(new Vec3(), this._targetPosition, this.node.worldPosition);
        dir.normalize();
        const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, dir);
        this.node.worldRotation = quatLerpTo(q, this.node.worldRotation, q, toRadian(360), deltaTime);
    }

    private _targetPosition = new Vec3();

    private _updateTargetPosition() {
        const x = randomRange(-0.5, 0.5) * this.lcd!.worldScale.x;
        const y = randomRange(-0.5, 0.5) * this.lcd!.worldScale.y;
        Vec3.set(this._targetPosition, x, y, -this.lcd!.worldScale.z / 2);
        Vec3.add(this._targetPosition, this.lcd!.worldPosition, this._targetPosition);
    }
}


