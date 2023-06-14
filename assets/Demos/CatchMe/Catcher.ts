import { _decorator, animation, Camera, clamp01, Color, Component, EventMouse, find, geometry, Input, input, lerp, Mat3, Mat4, Node, physics, Quat, toRadian, Vec3 } from 'cc';
import { DEBUG } from 'cc/env';
import { drawCube, drawLineFromTo, drawLineOriginDirLen } from '../../Source/Utils/DebugDraw';
import { componentToWorldPosition, worldToComponentPosition, worldToComponentRotation } from '../../Source/Utils/ComponentSpaceConversion';
import { lerpTo, quatLerpTo } from '../../Source/Utils/LerpTo';
import { getForward } from '../../Source/Utils/NodeUtils';
import { Catchee } from './Catchee';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('Catcher')
@requireComponent(animation.AnimationController)
export class Catcher extends Component {
    @property
    debug = false;

    @property(Node)
    rightHandBone: Node | null = null;

    @property(Node)
    rightHandIkBone: Node | null = null;

    @property(Node)
    palmBone: Node | null = null;

    @property({ unit: 'm/s' })
    handMoveSpeed = 3;

    @property({ unit: '°/s' })
    handRotationSpeed = 360;

    @property(Node)
    eye: Node | null = null;

    onEnable() {
        input.on(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
    }

    onDisable() {
        input.off(Input.EventType.MOUSE_MOVE, this._onMouseMove, this);
    }

    update(deltaTime: number) {
        this._updateHandIk(deltaTime);
        this._updateAim(deltaTime);
    }

    protected lateUpdate(dt: number): void {
        this._updateHandRotation(dt);
    }

    private _hasTarget = false;
    private _currentPositionCs = new Vec3();
    private _targetPositionCs = new Vec3();
    private _lastTargetPositionCs = new Vec3();
    private _targetNormalWs = new Vec3();
    private _hasRan = false;
    private _handTargetRotationWs = new Quat();
    private _handRotationWs = new Quat();

    private _onMouseMove(event: EventMouse) {
        const camera = find('Main Camera')?.getComponent(Camera);
        if (!camera) {
            return;
        }
        const ray = new geometry.Ray();
        camera.screenPointToRay(event.getLocationX(), event.getLocationY(), ray);
        this._updateTarget(ray);
    }

    private _updateTarget(ray: geometry.Ray) {
        if (!physics.PhysicsSystem.instance.raycastClosest(ray, -1, 10, undefined)) {
            this._hasTarget = false;
        } else {
            this._hasTarget = true;
            Vec3.copy(this._lastTargetPositionCs, this._targetPositionCs);
            const hit = physics.PhysicsSystem.instance.raycastClosestResult;
            this.node.inverseTransformPoint(this._targetPositionCs, hit.hitPoint);
            Vec3.copy(this._targetNormalWs, hit.hitNormal); // TODO: to ws
        }
    }

    private _updateHandIk(deltaTime: number) {
        if (!this._hasRan) {
            this._hasRan = true;
            worldToComponentPosition(this._currentPositionCs, this.rightHandIkBone!.worldPosition, this);
        }

        if (!this._hasTarget) {
            worldToComponentPosition(this._targetPositionCs, this.rightHandIkBone!.worldPosition, this);
        }

        lerpTo(this._currentPositionCs, this._currentPositionCs, this._targetPositionCs, this.handMoveSpeed, deltaTime);
        const animationController = this.node.getComponent(animation.AnimationController)!;
        animationController.setValue_experimental('TargetPosition', this._currentPositionCs);

        if (DEBUG && this.debug) {
            drawCube(
                Vec3.scaleAndAdd(new Vec3(),
                    componentToWorldPosition(new Vec3(), this._targetPositionCs, this),
                    this._targetNormalWs, 0.0),
                0.05,
                Color.RED,
            );
            drawCube(
                this.rightHandIkBone!.worldPosition,
                0.05,
                Color.BLUE,
            );
            drawCube(
                componentToWorldPosition(new Vec3(), this._currentPositionCs, this),
                0.05,
                Color.GREEN,
            );
        }
    }

    private _updateHandRotation(deltaTime: number) {
        const handBone = this.rightHandBone!;
        const handIkBone = this.rightHandIkBone!;

        let handTargetRotationWs = new Quat();
        if (!this._hasTarget) {
            Quat.copy(handTargetRotationWs, handIkBone.worldRotation);
        } else {
            const handPositionWs = handBone!.worldPosition;
            const targetPositionWs = componentToWorldPosition(new Vec3(), this._targetPositionCs, this);
            const up = Vec3.subtract(new Vec3(), targetPositionWs, handPositionWs);
            if (Vec3.len(up) > 1e-4) {
                Vec3.normalize(up, up);
                const view = Vec3.negate(new Vec3(), this._targetNormalWs);
                Quat.fromViewUp(this._handTargetRotationWs, view, up);
                if (DEBUG && this.debug) {
                    const right = Vec3.cross(new Vec3(), up, view);
                    Vec3.normalize(right, right);
                    drawLineOriginDirLen(handBone.worldPosition, right, 0.3, Color.RED);
                    drawLineOriginDirLen(handBone.worldPosition, up, 0.3, Color.GREEN);
                }
            }
            Quat.copy(handTargetRotationWs, this._handTargetRotationWs);
        }

        quatLerpTo(this._handRotationWs,
            this._handRotationWs, handTargetRotationWs, toRadian(this.handRotationSpeed), deltaTime);

        handBone.worldRotation = this._handRotationWs;
    }

    private _updateAim(deltaTime: number) {
        const catchee = this.node.scene.getComponentInChildren(Catchee);
        if (!catchee) {
            return;
        }

        if (!this.eye) {
            return;
        }

        const animationController = this.getComponent(animation.AnimationController)!;

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();

        if (DEBUG && this.debug) {
            drawLineFromTo(
                this.eye.worldPosition,
                catchee.node.worldPosition,
                Color.BLUE,
            );
        }
        const viewDir = Vec3.subtract(new Vec3(), catchee.node.worldPosition, this.eye.worldPosition);
        Vec3.normalize(viewDir, viewDir);

        const pitch = Math.asin(viewDir.y);

        const viewDirHorizontal = Vec3.clone(viewDir);
        viewDirHorizontal.y = 0.0;
        viewDirHorizontal.normalize();

        const yaw = -signedAngleVec3(characterDir, viewDirHorizontal, Vec3.UP);
        
        animationController.setValue('AimUpDown', pitch / (Math.PI / 2));
        animationController.setValue(
            `AimRightLeft`,
            clampMap(yaw, -Math.PI, Math.PI, 0, 1)
        );
    }
}

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}


function clampMap(
    value: number,
    inputMin: number, inputMax: number,
    outputMin: number, outputMax: number,
) {
    const t = (value - inputMin) / (inputMax - inputMin);
    const clamped = clamp01(t);
    return lerp(outputMin, outputMax, clamped);
}
