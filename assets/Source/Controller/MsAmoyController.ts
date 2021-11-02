
import { _decorator, Component, Node, animation, math, input, Input, Touch, EventTouch, EventMouse, systemEvent, SystemEvent, sys, Prefab, instantiate, RigidBody, PhysicsSystem, RecyclePool, physics, geometry } from 'cc';
import { Damageable } from '../GamePlay/Damage/Damagable';
import { Damage } from '../GamePlay/Damage/Damage';
import { Joystick, JoystickEventType } from '../GamePlay/Joystick';
import { injectComponent } from '../Utils/Component';
import { useMouseInput } from '../Utils/Env';
import { getForward } from '../Utils/NodeUtils';
import { CharacterStatus } from './CharacterStatus';
const { ccclass, property } = _decorator;
import {} from 'cc/userland/macro';
import { DamageKey, DAMAGE_TABLE } from '../GamePlay/Damage/DamageTable';
import { waitFor } from '../Utils/Misc';

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

        this.joyStick.on(JoystickEventType.MOVE, (joystickDirection: Readonly<math.Vec2>) => {
            const baseSpeed = this._ironSights ? 1.0 : 2.0;
            const velocity = new math.Vec3(-joystickDirection.x, 0.0, joystickDirection.y);
            math.Vec3.normalize(velocity, velocity);
            math.Vec3.multiplyScalar(velocity, velocity, baseSpeed);
            this._charStatus.localVelocity = velocity;
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

    public update () {
        const { _charStatus: characterStatus } = this;
        const { localVelocity } = characterStatus;

        const velocity2D = new math.Vec2(localVelocity.x, localVelocity.z);
        // cc.math.Vec2.normalize(velocity2D, velocity2D);
        this._animationController.setValue('VelocityX', -velocity2D.x);
        this._animationController.setValue('VelocityY', velocity2D.y);
    }

    public onCrouchButtonClicked() {
        this._crouching = !this._crouching;
        this._animationController.setValue('Crouching', this._crouching);
    }

    public onJumpClicked() {
        this._animationController.setValue('Jump', true);
    }

    public onReloadClicked() {
        this._animationController.setValue('Reload', true);
    }

    public onFireClicked() {
        if (this._crouching) {
            return;
        }
        if (!this._canFire) {
            return;
        }
        this._fire();
        // const gun = this.gun;
        // for (let i = 0; i < 1; ++i) {
        //     const bullet = instantiate(this.bullet);
        //     bullet.setPosition(gun.worldPosition);
        //     bullet.forward = gun.forward;
        //     gun.scene.addChild(bullet);
        //     const rigidBody = bullet.getComponentInChildren<RigidBody>(RigidBody)!;
        //     rigidBody.applyForce(
        //         math.Vec3.multiplyScalar(new math.Vec3(), getForward(this.node), 50.0),
        //     );
        // }
    }

    public onIronSightsClicked() {
        this._ironSights = !this._ironSights;
        this._animationController.setValue('IronSights', this._ironSights);
    }

    public setVelocityX(value: number) {
        this._animationController.setValue('VelocityX', value);
    }

    public setVelocityY(value: number) {
        this._animationController.setValue('VelocityY', value);
    }

    @injectComponent(CharacterStatus)
    private _charStatus!: CharacterStatus;

    @injectComponent(animation.AnimationController)
    private _animationController!: animation.AnimationController;

    @injectComponent(Damageable)
    private _damageable!: Damageable;

    private _crouching = false;
    private _ironSights = false;
    private _turnEnabled = false;
    private _canFire = true;
    private _rayCastResultPool = new RecyclePool<physics.PhysicsRayResult>(
        () => new physics.PhysicsRayResult(),
        4,
    );

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
    }

    private _onDamaged(damage: Damage) {
        this._animationController.setValue('Hit', true);
    }

    private _fire() {
        this._canFire = false;

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
        const attackInfo = DAMAGE_TABLE[DamageKey.AMOY_ATTACK];
        if (PhysicsSystem.instance.raycast(
            ray,
            1 << 2,
            attackInfo.distance,
            false,
        )) {
            for (const raycastResult of PhysicsSystem.instance.raycastResults) {
                const damageable = raycastResult.collider.node.getComponent<Damageable>(Damageable);
                if (damageable) {
                    damageable.applyDamage({
                        key: DamageKey.AMOY_ATTACK,
                        source: this,
                        direction: forward,
                    });
                }
            }
        }

        (async () => {
            await waitFor(0.3);
            this._canFire = true;
        })();
    }
}
