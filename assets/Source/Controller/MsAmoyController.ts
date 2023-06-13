
import { _decorator, Component, Node, animation, math, input, Input, Touch, EventTouch, EventMouse, sys, Prefab, instantiate, RigidBody, PhysicsSystem, RecyclePool, physics, geometry, director, Vec3, EventKeyboard, KeyCode, Vec2 } from 'cc';
import { Damageable } from '../GamePlay/Damage/Damagable';
import { Damage } from '../GamePlay/Damage/Damage';
import { Joystick, JoystickEventType } from '../GamePlay/Joystick';
import { injectComponent } from '../Utils/Component';
import { useMouseInput } from '../Utils/Env';
import { getForward } from '../Utils/NodeUtils';
import { CharacterStatus } from './CharacterStatus';
const { ccclass, property } = _decorator;
import { DamageKey, DAMAGE_TABLE } from '../GamePlay/Damage/DamageTable';
import { waitFor } from '../Utils/Misc';
import { Bullet } from '../GamePlay/Bullet';
import { globalInputManager } from '../Input/Input';
import { PredefinedActionId, PredefinedAxisId } from '../Input/Predefined';

@ccclass('MsAmoyController')
export class MsAmoyController extends Component {
    public static instance: MsAmoyController | null = null;

    @_decorator.property
    public mouseTurnSpeed = 1.0;

    @_decorator.property(Node)
    public input: Node | null = null;

    @property(Joystick)
    public joyStick!: Joystick;

    @property(Node)
    public gun!: Node;

    @property(Prefab)
    public bullet!: Prefab;

    public start () {
        MsAmoyController.instance = this;
        
        if (this.input) {
            const { input } = this;
            if (useMouseInput()) {
                input.on(Node.EventType.MOUSE_DOWN, this._onMouseDown, this);
                input.on(Node.EventType.MOUSE_MOVE, this._onMouseMove, this);
                input.on(Node.EventType.MOUSE_UP, this._onMouseUp, this);
            } else {
                input.on(Node.EventType.TOUCH_START, this._onTouchBegin, this);
                input.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
            }
        }

        this.joyStick.on(JoystickEventType.MOVE, (_joystickDirection: Readonly<math.Vec2>) => {
            this._hasUnprocessedMoveRequest = true;
        });

        this.joyStick.on(JoystickEventType.RELEASE, () => {
            this._charStatus.velocity = math.Vec3.ZERO;
        });

        this._damageable.on(Damageable.EventType.DAMAGE, (damage: Damage) => {
            this._onDamaged(damage);
        });
    }

    public onDestroy() {
        MsAmoyController.instance = null;
    }

    private _lastAnimStatusText = '';

    public update (deltaTime: number) {
        const { _charStatus: characterStatus } = this;
        const { localVelocity } = characterStatus;

        let animStatusText = '';
        const currentStatus = this._animationController.getCurrentStateStatus(0);
        if (currentStatus) {
            animStatusText += `${currentStatus.__DEBUG_ID__ ?? '<unnamed>'}`;
        }
        if (this._animationController.getCurrentTransition(0)) {
            const nextStatus = this._animationController.getNextStateStatus(0);
            if (nextStatus) {
                animStatusText += ` -> ${nextStatus.__DEBUG_ID__ ?? '<unnamed>'}`;
            }
        }

        if (this._lastAnimStatusText !== animStatusText) {
            this._lastAnimStatusText = animStatusText;
            console.log(`Animation status changed: ${animStatusText}`);
        }

        if (this._isAiming) {
            if (this._aimingTimer > 5.0) {
                this._isAiming = false;
            } else {
                this._aimingTimer += deltaTime;
            }
        }

        if (this._canMove()) {
            this._applyInputVelocity();
            if (this._hasUnprocessedMoveRequest) {
                console.log(`Apply movement`);
                this._hasUnprocessedMoveRequest = false;
                this._applyJoystickDirection();
            }
            const velocity2D = new math.Vec2(localVelocity.x, localVelocity.z);
            // cc.math.Vec2.normalize(velocity2D, velocity2D);
            this._animationController.setValue('VelocityX', -velocity2D.x);
            this._animationController.setValue('VelocityY', velocity2D.y);
        }

        if (globalInputManager.getAction(PredefinedActionId.Fire)) {
            this._requestFire();
        }

        if (globalInputManager.getAction(PredefinedActionId.IronSights)) {
            this._requestIronSights();
        }

        if (globalInputManager.getAction(PredefinedActionId.Jump)) {
            this._jump();
        }

        if (globalInputManager.getAction(PredefinedActionId.Reload)) {
            this._reload();
        }

        if (globalInputManager.getAction(PredefinedActionId.Crouch)) {
            this._requestCrouch();
        }
    }

    public lateUpdate() {
        this._animationController.setValue('Aiming', this._isAiming);
        // Reset triggers
        // this._animationController.setValue('Hit', false);
        this._animationController.setValue('Jump', false);
        this._animationController.setValue('Reload', false);
    }

    public onCrouchButtonClicked() {
        this._requestCrouch();
    }

    public onJumpClicked() {
        this._jump();
    }

    public onReloadClicked() {
        this._reload();
    }

    public onFireClicked() {
        this._requestFire();
    }

    public onIronSightsClicked() {
        this._requestIronSights();
    }

    public setVelocityX(value: number) {
        this._animationController.setValue('VelocityX', value);
    }

    public setVelocityY(value: number) {
        this._animationController.setValue('VelocityY', value);
    }

    public lockMovement() {
        ++this._moveLockerCount;
        console.log(`Lock movement: ${this._moveLockerCount}`);
        this._stopImmediately();
    }

    public unlockMovement() {
        --this._moveLockerCount;
        console.log(`Unlock movement: ${this._moveLockerCount}`);
    }

    public playAttackEffect() {
        const gun = this.gun;
        for (let i = 0; i < 10; ++i) {
            const bullet = instantiate(this.bullet);
            bullet.setPosition(gun.worldPosition);
            bullet.forward = gun.forward;
            gun.scene.addChild(bullet);
            const bulletComponent = bullet.getComponent(Bullet)!;
            bulletComponent.source = this;
            const rigidBody = bullet.getComponentInChildren<RigidBody>(RigidBody)!;
            rigidBody.applyForce(
                math.Vec3.multiplyScalar(new math.Vec3(), getForward(this.node), 50.0),
            );
        }
    }

    @injectComponent(CharacterStatus)
    private _charStatus!: CharacterStatus;

    @injectComponent(animation.AnimationController)
    private _animationController!: animation.AnimationController;

    @injectComponent(Damageable)
    private _damageable!: Damageable;

    private _hasUnprocessedMoveRequest = false;

    /**
     * Set from state machine.
     */
    private _moveLockerCount = 0;
    private _isAiming = false;
    private _aimingTimer = 0.0;
    private _isCrouching = false;
    private _ironSights = false;
    private _turnEnabled = false;
    private _isFiring = false;
    private _isReactingToHit = false;
    private _rayCastResultPool = new RecyclePool<physics.PhysicsRayResult>(
        () => new physics.PhysicsRayResult(),
        4,
    );

    private _canMove() {
        return !this._isFiring && !this._isReactingToHit && this._moveLockerCount === 0;
    }

    private _canFire() {
        return !this._isFiring && !this._isCrouching;
    }

    private _applyJoystickDirection() {
        const { joyStick: { direction: joystickDirection } } = this;
        const baseSpeed = this._ironSights ? 1.0 : 2.0;
        const velocity = new math.Vec3(-joystickDirection.x, 0.0, joystickDirection.y);
        math.Vec3.normalize(velocity, velocity);
        math.Vec3.multiplyScalar(velocity, velocity, baseSpeed);
        this._charStatus.localVelocity = velocity;
    }

    private _applyInputVelocity() {
        const inputVelocity = new Vec2(
            globalInputManager.getAxisValue(PredefinedAxisId.MoveRight),
            globalInputManager.getAxisValue(PredefinedAxisId.MoveForward),
        );

        const baseSpeed = this._ironSights ? 1.0 : 2.0;

        const velocity = new math.Vec3(-inputVelocity.x, 0.0, inputVelocity.y);
        math.Vec3.normalize(velocity, velocity);
        math.Vec3.multiplyScalar(velocity, velocity, baseSpeed);
        this._charStatus.localVelocity = velocity;
    }

    private _onMouseDown (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_RIGHT:
                this._turnEnabled = true;
                break;
        }
    }

    private _onMouseMove (event: EventMouse) {
        if (this._turnEnabled) {
            const dx = event.getDeltaX();
            if (dx) {
                const angle = -dx * this.mouseTurnSpeed;
                this.node.rotate(
                    math.Quat.rotateY(new math.Quat(), math.Quat.IDENTITY, math.toRadian(angle)),
                    Node.NodeSpace.WORLD,
                );
            }
        }
    }

    private _onMouseUp (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_RIGHT:
                this._turnEnabled = false;
                break;
        }
    }

    private _onTouchBegin (eventTouch: EventTouch) {
        
    }

    private _onTouchMove (eventTouch: EventTouch) {
        if (eventTouch.getTouches().length === 1) {
            const dx = eventTouch.getUIDelta().x;
            if (dx) {
                const angle = -dx * this.mouseTurnSpeed;
                this.node.rotate(
                    math.Quat.rotateY(new math.Quat(), math.Quat.IDENTITY, math.toRadian(angle)),
                    Node.NodeSpace.WORLD,
                );
            }
        }
    }

    private _onDamaged(damage: Damage) {
        this._animationController.setValue('Hit', true);

        this._isReactingToHit = true;

        const scheduler = director.getScheduler();
        if (scheduler.isScheduled(this._onHitReactionTimeElapsed, this)) {
            scheduler.unschedule(this._onHitReactionTimeElapsed, this);
        }
        scheduler.schedule(this._onHitReactionTimeElapsed, this, 0.8);
    }

    private _onHitReactionTimeElapsed() {
        this._isReactingToHit = false;

        this._applyJoystickDirection();

        const scheduler = director.getScheduler();
        scheduler.unschedule(this._onHitReactionTimeElapsed, this);
    }

    private _requestFire() {
        if (!this._canFire()) {
            return;
        }

        this._fire();
    }

    private _fire() {
        this._isFiring = true;

        this._isAiming = true;
        this._aimingTimer = 0.0;

        const {
            node,
            gun,
            _rayCastResultPool: pool,
        } = this;

        this._charStatus.velocity = Vec3.ZERO;

        this._animationController.setValue('Fire', true);

        const forward = getForward(node);
        const firePosition = gun.worldPosition;
        const ray = new geometry.Ray(
            firePosition.x,
            firePosition.y,
            firePosition.z,
            forward.x,
            forward.y,
            forward.z,
        );
        // const attackInfo = DAMAGE_TABLE[DamageKey.AMOY_ATTACK];
        // if (PhysicsSystem.instance.raycast(
        //     ray,
        //     1 << 2,
        //     attackInfo.distance,
        //     false,
        // )) {
        //     for (const raycastResult of PhysicsSystem.instance.raycastResults) {
        //         const damageable = raycastResult.collider.node.getComponent<Damageable>(Damageable);
        //         if (damageable) {
        //             damageable.applyDamage({
        //                 key: DamageKey.AMOY_ATTACK,
        //                 source: this,
        //                 direction: forward,
        //             });
        //         }
        //     }
        // }

        (async () => {
            await waitFor(0.3);
            this._isFiring = false;
        })();
    }

    private _requestIronSights() {
        this._ironSights = !this._ironSights;
        this._animationController.setValue('IronSights', this._ironSights);
    }

    private _requestCrouch() {
        this._isCrouching = !this._isCrouching;
        this._animationController.setValue('Crouching', this._isCrouching);
    }

    private _jump() {
        this._animationController.setValue('Jump', true);
    }

    private _reload() {
        this._animationController.setValue('Reload', true);
    }

    private _stopImmediately() {
        this._charStatus.setVelocityImmediate(Vec3.ZERO);
        this._hasUnprocessedMoveRequest = true;
    }
}
