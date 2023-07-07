
import { _decorator, Component, Node, animation, math, input, Input, Touch, EventTouch, EventMouse, sys, Prefab, instantiate, RigidBody, PhysicsSystem, RecyclePool, physics, geometry, director, Vec3, EventKeyboard, KeyCode, Vec2, find, Quat, toDegree, NodeSpace, toRadian } from 'cc';
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

    @_decorator.property({ unit: '°/s' })
    public moveTurnSpeed = 270;

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

        const movementInput = this._fetchMovementInput();
        const shouldMove = !Vec3.equals(movementInput, Vec3.ZERO, 1e-2);
        this._animationController.setValue('ShouldMove', shouldMove);
        if (this._canMove()) {
            if (!Vec3.equals(movementInput, Vec3.ZERO)) {
                this._faceView(deltaTime);
            }

            this._applyInput(movementInput);
            const velocity2D = new math.Vec2(localVelocity.x, localVelocity.z);
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
        return !this._isReactingToHit && this._moveLockerCount === 0;
    }

    private _canFire() {
        return !this._isFiring;
    }

    private _fetchMovementInput() {
        const joystickDirection = this.joyStick.direction;
        const inputDirX = globalInputManager.getAxisValue(PredefinedAxisId.MoveRight);
        const inputDirY = globalInputManager.getAxisValue(PredefinedAxisId.MoveForward);
        const input = new Vec3(
            -(joystickDirection.x + inputDirX),
            0.0,
            joystickDirection.y + inputDirY,
        );
        Vec3.normalize(input, input);
        return input;
    }

    private _applyInput(movementInput: Readonly<Vec3>) {
        const inputVector = new Vec3(movementInput);
        const baseSpeed = this._ironSights ? 1.0 : 2.0;
        math.Vec3.normalize(inputVector, inputVector);
        math.Vec3.multiplyScalar(inputVector, inputVector, baseSpeed);

        const viewDir = this._getViewDirection(new Vec3());
        viewDir.y = 0.0;
        Vec3.normalize(viewDir, viewDir);

        const q = Quat.rotationTo(new Quat(), Vec3.UNIT_Z, viewDir);
        Vec3.transformQuat(inputVector, inputVector, q);

        this._charStatus.velocity = inputVector;
    }

    private _faceView(deltaTime: number) {
        const viewDir = this._getViewDirection(new Vec3());
        viewDir.y = 0.0;
        viewDir.normalize();

        const characterDir = getForward(this.node);
        characterDir.y = 0.0;
        characterDir.normalize();

        const currentAimAngle = signedAngleVec3(characterDir, viewDir, Vec3.UNIT_Y);
        const currentAimAngleDegMag = toDegree(Math.abs(currentAimAngle));
        
        const maxRotDegMag = this.moveTurnSpeed * deltaTime;
        const rotDegMag = Math.min(maxRotDegMag, currentAimAngleDegMag);
        const q = Quat.fromAxisAngle(new Quat(), Vec3.UNIT_Y, Math.sign(currentAimAngle) * toRadian(rotDegMag));
        this.node.rotate(q, NodeSpace.WORLD);
    }

    private _getViewDirection(out: Vec3) {
        const mainCamera = find('Main Camera');
        if (!mainCamera) {
            return Vec3.set(out, 0, 0, -1);
        } else {
            return Vec3.negate(out, getForward(mainCamera));
        }
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

function signedAngleVec3(a: Readonly<Vec3>, b: Readonly<Vec3>, normal: Readonly<Vec3>) {
    const angle = Vec3.angle(a, b);
    const cross = Vec3.cross(new Vec3(), a, b);
    cross.normalize();
    return Vec3.dot(cross, normal) < 0 ? -angle : angle;
}
