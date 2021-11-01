// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as cc from 'cc';
import { useMouseInput } from '../Utils/Env';
import { reflect } from '../Utils/Math';
import { getForward } from '../Utils/NodeUtils';

@cc._decorator.ccclass('FirstPersonCamera')
@cc._decorator.executionOrder(9999)
export class FirstPersonCamera extends cc.Component {
    @cc._decorator.property({
        type: cc.Node,
        displayName: '输入设备',
        tooltip: '输入设备。可以选择某个 UI 节点。',
    })
    public input: cc.Node | null = null;

    @cc._decorator.property({
        displayName: '最小距离',
        tooltip: '与目标的最小距离。',
    })
    public minDistance = 0.1;

    @cc._decorator.property({
        displayName: '最大距离',
        tooltip: '与目标的最大距离。',
    })
    public maxDistance = 20.0;

    @cc._decorator.property({
        displayName: '初始距离',
        tooltip: '初始时与目标的距离。',
    })
    public initialDistance = 1.0;

    @cc._decorator.property({
        displayName: '初始水平旋转',
        tooltip: '初始时在水平方向上的旋转。',
    })
    public initialHorizonRotation = 0.0;

    @cc._decorator.property({
        displayName: '初始垂直旋转',
        tooltip: '初始时在垂直方向上的旋转。',
    })
    public initialVerticalRotation = 45.0;

    @cc._decorator.property({
        displayName: '水平旋转速度',
        tooltip: '在水平方向上的旋转速度。',
    })
    public horizonRotationSpeed = 1.0;

    @cc._decorator.property({
        displayName: '垂直旋转速度',
        tooltip: '在垂直方向上的旋转速度。',
    })
    public verticalRotationSpeed = 1.0;

    @cc._decorator.property({
        displayName: '滚轮拉近速度',
        tooltip: '鼠标滚轮拉近速度。',
    })
    public mouseWheelSpeed = 0.01;

    @cc._decorator.property({
        displayName: '触摸拉近速度',
        tooltip: '触摸拉近速度。',
    })
    public touchZoomSpeed = 0.01;

    @cc._decorator.property({
        type: cc.Node,
        displayName: '目标',
        tooltip: '要跟随的目标。',
    })
    public target!: cc.Node;

    @cc._decorator.property({
        displayName: '自动跟随',
        tooltip: '是否启用自动跟随。启用后，将在目标位置发生改变时自动调整至目标后方。',
    })
    public autoTraceEnabled = true;

    @cc._decorator.property({
        displayName: '自动跟随速度',
        tooltip: '自动跟随速度。',
        visible(this: FirstPersonCamera) {
            return this.autoTraceEnabled;
        },
    })
    public autoTraceSpeed = 180.0;

    public start () {
        this._zoom(this.initialDistance);
        this._rotateHorizon(this.initialHorizonRotation);
        this._rotateVertical(this.initialVerticalRotation);
        this._updatePosition();
        const { input } = this;
        if (input) {
            if (useMouseInput()) {
                input.on(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
                input.on(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
                input.on(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);
                input.on(cc.Node.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
            } else {
                console.log(`Touch`);
                input.on(cc.Node.EventType.TOUCH_START, this._onTouchBegin, this);
                input.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
                input.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this);
            }
        }
    }

    public onDestroy () {
        const { input } = this;
        if (input) {
            if (useMouseInput()) {
                input.off(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
                input.off(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
                input.off(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);
                input.off(cc.Node.EventType.MOUSE_WHEEL, this._onMouseWheel, this);
            }
        }
    }

    public update (deltaTime: number) {
        const targetWorldPosition = this.target.worldPosition;
        const targetLastPosition = this._targetLastPosition;
        let targetPositionChanged = !cc.math.Vec3.strictEquals(targetLastPosition, targetWorldPosition);

        if (targetPositionChanged && this.autoTraceEnabled) {
            cc.math.Vec3.copy(targetLastPosition, targetWorldPosition);
            this._autoTrace(deltaTime);
        }

        if (targetPositionChanged || this._currentDirDirty) {
            this._currentDirDirty = false;
            this._updatePosition();
        }
    }

    private _targetLastPosition = new cc.math.Vec3();
    private _currentDirDirty = true;
    private _currentDir = cc.math.Vec3.negate(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z);
    private _mouseButtonPressing = {
        left: false,
        right: false,
        middle: false,
    };

    private _previousTwoTouchDistance = 0.0;
    private _touches: Array<{
        id: number;
        location: cc.Vec2;
    }> = [];

    private _calcTransform (targetPosition: cc.math.Vec3, outPosition: cc.math.Vec3, outRotation: cc.math.Quat) {
        const dir = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        cc.math.Quat.fromViewUp(outRotation, dir, cc.math.Vec3.UNIT_Y);
        cc.math.Vec3.add(outPosition, targetPosition, this._currentDir);
    }

    private _onMouseDown (event: cc.EventMouse) {
        switch (event.getButton()) {
            default: break;
            case cc.EventMouse.BUTTON_LEFT: this._mouseButtonPressing.left = true; break;
            case cc.EventMouse.BUTTON_RIGHT: this._mouseButtonPressing.right = true; break;
            case cc.EventMouse.BUTTON_MIDDLE: this._mouseButtonPressing.middle = true; break;
        }
    }

    private _onMouseMove (event: cc.EventMouse) {
        if (this._mouseOrTouchMoveEnabled) {
            const dx = event.getDeltaX();
            if (dx) {
                const angle = -dx * this.horizonRotationSpeed;
                this._rotateHorizon(angle);
            }
            const dy = event.getDeltaY();
            if (dy) {
                const angle = -dy * this.verticalRotationSpeed;
                this._rotateVertical(angle);
            }
        }
    }

    private _onMouseUp (event: cc.EventMouse) {
        switch (event.getButton()) {
            default: break;
            case cc.EventMouse.BUTTON_LEFT: this._mouseButtonPressing.left = false; break;
            case cc.EventMouse.BUTTON_RIGHT: this._mouseButtonPressing.right = false; break;
            case cc.EventMouse.BUTTON_MIDDLE: this._mouseButtonPressing.middle = false; break;
        }
    }

    private _onMouseWheel (event: cc.EventMouse) {
        const deltaZoom = -this.mouseWheelSpeed * event.getScrollY();
        this._zoomDelta(deltaZoom);
    }

    private _onTouchBegin (eventTouch: cc.EventTouch) {
        console.log(`Touches Begin: ${eventTouch.getTouches().length}`);
        const touches = eventTouch.getTouches();
        for (const touch of touches) {
            if (this._touches.length < 2) {
                this._touches.push({
                    id: touch.getID(),
                    location: cc.math.Vec2.clone(touch.getLocation()),
                });
            }
        }
    }

    private _onTouchMove (eventTouch: cc.EventTouch) {
        console.log(`Touches Move: ${this._touches.length}`);
        if (this._touches.length !== 2) {
            return;
        }

        const touches = eventTouch.getTouches();
        if (touches.length !== 2) {
            return;
        }

        const newTouches = this._touches.map(({ id }) => touches.find((touch) => touch.getID() === id));
        if (newTouches.some((touch) => !touch)) {
            return;
        }

        const oldTouch0Location = this._touches[0].location;
        const oldTouch1Location = this._touches[1].location;
        const newTouch0Location = newTouches[0]!.getLocation();
        const newTouch1Location = newTouches[1]!.getLocation();

        const dir0 = cc.math.Vec2.subtract(new cc.math.Vec2(), newTouch0Location, oldTouch0Location);
        cc.math.Vec2.normalize(dir0, dir0);
        const dir1 = cc.math.Vec2.subtract(new cc.math.Vec2(), newTouch1Location, oldTouch1Location);
        cc.math.Vec2.normalize(dir1, dir1);

        const angle = cc.math.toDegree(cc.math.Vec2.angle(dir0, dir1));
        if (angle > 170.0) {
            // Zoom
            const previousDistance = cc.math.Vec2.distance(
                oldTouch0Location,
                oldTouch1Location,
            );
            const thisDistance = cc.math.Vec2.distance(
                newTouch0Location,
                newTouch1Location,
            );
            const dDistance = thisDistance - previousDistance;
            if (dDistance !== 0) {
                const deltaZoom = -this.touchZoomSpeed * dDistance;
                this._zoomDelta(deltaZoom);
            }
        } else if (angle < 10.0) {
            const delta = cc.math.Vec2.subtract(new cc.math.Vec2(), newTouch0Location, oldTouch0Location);
            const dx = delta.x;
            if (dx) {
                const angle = -dx * this.horizonRotationSpeed;
                this._rotateHorizon(angle);
            }
            const dy = delta.y;
            if (dy) {
                const angle = -dy * this.verticalRotationSpeed;
                this._rotateVertical(angle);
            }
        }

        cc.math.Vec2.copy(oldTouch0Location, newTouch0Location);
        cc.math.Vec2.copy(oldTouch1Location, newTouch1Location);
    }

    private _onTouchEnd (eventTouch: cc.EventTouch) {
        this._touches = this._touches.filter((touch) =>
            eventTouch.getTouches().findIndex((removal) => removal.getID() !== touch.id) < 0);
    }

    private _updatePosition () {
        const position = new cc.math.Vec3();
        const rotation = new cc.math.Quat();
        this._calcTransform(this.target.worldPosition, position, rotation);
        this.node.position = position;
        this.node.rotation = rotation;
    }

    private _autoTrace (deltaTime: number) {
        const save = cc.math.Vec3.clone(this._currentDir);
        const targetBackward = cc.math.Vec3.negate(new cc.math.Vec3(), getForward(this.target));
        const currentDirNormalized = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        const up = cc.math.Vec3.UNIT_Y;

        const currentDirXZ = cc.math.Vec3.projectOnPlane(new cc.math.Vec3(), currentDirNormalized, up);
        cc.math.Vec3.normalize(currentDirXZ, currentDirXZ);
        const currentAngle = cc.math.Vec3.angle(currentDirXZ, targetBackward);
        if (cc.math.approx(currentAngle, 0.0, 1e-5)) {
            return;
        }
        if (currentAngle !== Math.PI) {
            const currentAngleDegrees = cc.math.toDegree(currentAngle);
            const clampedAngle = cc.math.clamp(deltaTime * this.autoTraceSpeed, 0.0, 180.0 - currentAngleDegrees);
            const axis = cc.math.Vec3.cross(new cc.math.Vec3(), currentDirXZ, targetBackward);
            const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), axis, cc.math.toRadian(clampedAngle));
            cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
            this._currentDirDirty = true;
        }

        const old = cc.math.Vec3.angle(up, save);
        const news = cc.math.Vec3.angle(up, this._currentDir);
        if (!cc.math.approx(old, news, 1e-5)) {
            debugger;
        }
    }

    private _zoom (distance: number) {
        const clamped = cc.math.clamp(distance, this.minDistance, this.maxDistance);
        cc.math.Vec3.normalize(this._currentDir, this._currentDir);
        cc.math.Vec3.multiplyScalar(this._currentDir, this._currentDir, clamped);
        this._currentDirDirty = true;
    }

    private _zoomDelta (delta: number) {
        const currentLen = cc.math.Vec3.len(this._currentDir);
        const len = currentLen + delta;
        this._zoom(len);
    }

    private _rotateHorizon (angle: number) {
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), cc.math.Vec3.UNIT_Y, cc.math.toRadian(angle));
        cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
        this._currentDirDirty = true;
    }

    private _rotateVertical (angle: number) {
        const currentDirNorm = cc.math.Vec3.normalize(new cc.math.Vec3(), this._currentDir);
        const up = cc.math.Vec3.UNIT_Y;

        const axis = cc.math.Vec3.cross(new cc.math.Vec3(), currentDirNorm, up);
        cc.math.Vec3.normalize(axis, axis);

        const currentAngle = cc.math.toDegree(cc.math.Vec3.angle(currentDirNorm, up));
        const DISABLE_FLIP_DELTA = 1e-2;
        const clampedAngle = currentAngle - cc.math.clamp(currentAngle - angle, 0.0 + DISABLE_FLIP_DELTA, 180.0 - DISABLE_FLIP_DELTA);
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), axis, cc.math.toRadian(clampedAngle));
        cc.math.Vec3.transformQuat(this._currentDir, this._currentDir, q);
        this._currentDirDirty = true;
    }

    private get _mouseOrTouchMoveEnabled() {
        return this._mouseButtonPressing.left;
    }
}
