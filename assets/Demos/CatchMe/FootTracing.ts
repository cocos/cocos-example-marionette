import { _decorator, animation, Color, Component, geometry, Node, physics, Vec3 } from 'cc';
import { DEBUG } from 'cc/env';
import { drawCube, drawLineFromTo, drawLineOriginDirLen } from '../../Source/Utils/DebugDraw';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('FootTracing')
@requireComponent(animation.AnimationController)
export class FootTracing extends Component {
    @property
    public debug = false;

    @property(Node)
    public footIKBone: Node | null = null;

    @property
    public traceOffset = 0.5;

    @property({ min: 0.0 })
    public traceLength = 1.0;

    @property
    public traceResultOffset = 0.0;

    @property
    public targetPositionVariableName = '';

    start() {

    }

    update(deltaTime: number) {
        if (!this.footIKBone) {
            return;
        }
        if (DEBUG && this.debug) {
            drawCube(
                this.footIKBone.worldPosition,
                0.05,
                Color.RED,
            );
        }
        const traceStart = new Vec3(this.footIKBone.worldPosition);
        traceStart.y += this.traceOffset;
        const traceEnd = Vec3.scaleAndAdd(new Vec3(), traceStart, Vec3.UNIT_Y, -this.traceLength);
        const traceLen = this.traceLength;
        const ray = geometry.Ray.fromPoints(new geometry.Ray(), traceStart, traceEnd);
        if (DEBUG && this.debug) {
            drawCube(
                traceStart,
                0.05,
                Color.BLACK,
            );
            drawLineFromTo(
                traceStart,
                traceEnd,
                Color.RED,
            );
        }
        if (!physics.PhysicsSystem.instance.raycastClosest(ray, -1, traceLen, undefined)) {
            return;
        }
        const hit = physics.PhysicsSystem.instance.raycastClosestResult;
        if (DEBUG && this.debug) {
            drawCube(
                hit.hitPoint,
                0.05,
                Color.BLUE,
            );
        }
        const targetPositionCs = this.node.inverseTransformPoint(new Vec3(), hit.hitPoint);
        targetPositionCs.y += this.traceResultOffset;
        const animationController = this.node.getComponent(animation.AnimationController)!;
        animationController.setValue_experimental(this.targetPositionVariableName, targetPositionCs);
    }
}


