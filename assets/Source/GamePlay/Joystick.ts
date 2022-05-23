

import * as cc from 'cc';
import { HTML5 } from 'cc/env';
import { useMouseInput } from '../Utils/Env';

export enum JoystickEventType {
    PRESS,
    RELEASE,
    MOVE,
}

@cc._decorator.ccclass
export class Joystick extends cc.Eventify(cc.Component) {
    public backgroundRadius = 100;

    get pressing () {
        return this._pressing;
    }

    get direction (): Readonly<cc.math.Vec2> {
        return this._direction;
    }

    public start () {
        const uiTransform = this.getComponent(cc.UITransform);
        if (!uiTransform) {
            cc.error(`Missing component UITransform`);
            return;
        }
        this._uiTransform = uiTransform;

        const bar = this.node.getChildByName('Bar');
        if (!bar) {
            cc.error(`Missing node Bar`);
            return;
        }
        this._bar = bar;

        const background = this.node.getChildByName('Background');
        if (!background) {
            cc.error(`Missing node Background`);
            return;
        }
        this._background = background;

        this._originalPositionBar = this._bar.getPosition(new cc.math.Vec3());
        this._originalPositionBackground = this._background.getPosition(new cc.math.Vec3());

        if (useMouseInput()) {
            this.node.on(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
            //this.node.on(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
            // this.node.on(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);
            cc.input.on(cc.Input.EventType.MOUSE_MOVE, (eventMouse) => {
                this._onClickOrTouchMove(eventMouse.getDelta());
            });
            cc.input.on(cc.Input.EventType.MOUSE_UP, () => {
                this._onClickOrTouchEnd();
            });
            if (HTML5) {
                document.addEventListener('pointerlockchange', () => {
                    if (document.pointerLockElement !== cc.game.canvas) {
                        this._onClickOrTouchEnd();
                    }
                });
            }
        } else {
            this.node.on(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            this.node.on(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
        }
    }

    public onDestroy () {
        if (useMouseInput()) {
            this.node.off(cc.Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
            this.node.off(cc.Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
            this.node.off(cc.Node.EventType.MOUSE_UP, this._onMouseUp, this);
        } else {
            this.node.off(cc.Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            this.node.off(cc.Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
        }
    }

    public update (deltaTime: number) {
    }

    private declare _uiTransform: cc.UITransform;
    private declare _bar: cc.Node;
    private declare _background: cc.Node;
    private declare _originalPositionBar: cc.Vec3;
    private declare _originalPositionBackground: cc.Vec3;
    private _pressing = false;
    private _direction: cc.math.Vec2 = new cc.math.Vec2();

    private _onMouseDown (event: cc.EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case cc.EventMouse.BUTTON_LEFT:
                this._onClickOrTouch(event.getUILocationX(), event.getUILocationY());
                break;
        }
    }

    private _onMouseMove (event: cc.EventMouse) {
        this._onClickOrTouchMove(new cc.math.Vec2(event.getDeltaX(), event.getDeltaY()));
    }

    private _onMouseUp (event: cc.EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case cc.EventMouse.BUTTON_LEFT:
                this._onClickOrTouchEnd();
                break;
        }
    }

    private _onThisNodeTouchStart (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }
        this._onClickOrTouch(touch.getUILocationX(), touch.getUILocationY());
    }

    private _onThisNodeTouchEnd () {
        this._onClickOrTouchEnd();
    }
    
    private _onThisNodeTouchCancelled () {
        this._onThisNodeTouchEnd();
    }

    private _onThisNodeTouchMove (touchEvent: cc.EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        this._onClickOrTouchMove(touch.getDelta());
    }

    private _onClickOrTouch(x: number, y: number) {
        const localPosition = this._uiTransform.convertToNodeSpaceAR(
            new cc.math.Vec3(x, y, 0.0),
            new cc.math.Vec3(),
        );
        this._bar.setPosition(localPosition);
        this._background.setPosition(localPosition);
        this._pressing = true;
        const maybePromise = cc.game.canvas?.requestPointerLock?.() as Promise<unknown> | undefined;
        if (maybePromise instanceof Promise) {
            // I've heard `requestPointerLock()` returns promise on Chrome
            // and the promise may be rejected if ESC is pressed.
            // Let's capture this just in case.
            maybePromise.catch((reason) => cc.debug(`requestPointerLock() is rejected: ${reason}`));
        }
        this.emit(JoystickEventType.PRESS);
    }

    private _onClickOrTouchEnd() {
        this._bar.setPosition(this._originalPositionBar);
        this._background.setPosition(this._originalPositionBackground);
        this._pressing = false;
        this.emit(JoystickEventType.RELEASE);
        cc.math.Vec2.set(this._direction, 0.0, 0.0);
        globalThis.document?.exitPointerLock?.();
    }

    private _onClickOrTouchMove(delta2D: cc.math.Vec2) {
        if (!this._pressing) {
            return;
        }
        const backgroundPosition = this._background.getPosition();

        const delta = new cc.math.Vec3(delta2D.x, delta2D.y);

        const barPosition = this._bar.getPosition(new cc.math.Vec3());
        cc.math.Vec3.add(barPosition, barPosition, delta);
        const { x, y } = clampCircular(barPosition.x, barPosition.y, backgroundPosition.x, backgroundPosition.y, this.backgroundRadius);
        cc.math.Vec3.set(barPosition, x, y, barPosition.z);
        this._bar.setPosition(barPosition);

        const dir3D = cc.math.Vec3.subtract(new cc.math.Vec3(), barPosition, backgroundPosition);
        cc.math.Vec3.normalize(dir3D, dir3D);
        cc.math.Vec2.set(this._direction, dir3D.x, dir3D.y);

        console.log(`Move ${delta}`);
        this.emit(JoystickEventType.MOVE, this._direction);
    }

    private _onGlobalMouseUp () {
        this._onClickOrTouchEnd();
    }
}

function clampCircular (x: number, y: number, centerX: number, centerY: number, radius: number) {
    const center = new cc.math.Vec2(centerX, centerY);
    const dir = new cc.math.Vec2(x, y);
    cc.math.Vec2.subtract(dir, dir, center);
    const distance = cc.math.Vec2.len(dir);
    const clampedDistance = cc.math.clamp(distance, 0, radius);
    cc.math.Vec2.normalize(dir, dir);
    cc.math.Vec2.scaleAndAdd(dir, center, dir, clampedDistance);
    return { x: dir.x, y: dir.y };
}