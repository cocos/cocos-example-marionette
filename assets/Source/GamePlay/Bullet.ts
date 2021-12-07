
import { _decorator, Component, Node, Collider, ICollisionEvent, math, RigidBody, Vec3 } from 'cc';
import { MsAmoyController } from '../Controller/MsAmoyController';
import { injectComponent } from '../Utils/Component';
import { Damageable } from './Damage/Damagable';
import { DamageKey } from './Damage/DamageTable';
import { PhysicsIndex } from './Constants';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = Bullet
 * DateTime = Fri Nov 05 2021 16:54:06 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = Bullet.ts
 * FileBasenameNoExtension = Bullet
 * URL = db://assets/Source/GamePlay/Bullet.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */
 
@ccclass('Bullet')
export class Bullet extends Component {
    public source!: MsAmoyController;

    start () {
        this._rigidBody.useCCD = true;
        this._collider.on('onCollisionEnter', this._onCollisionEnter, this);
    }

    update (deltaTime: number) {
        if (this._rigidBody.isSleeping) {
            this.destroy();
        }
        // const velocity = new math.Vec3();
        // this._rigidBody.getLinearVelocity(velocity);
        // if (math.Vec3.equals(math.Vec3.ZERO, velocity)) {
        //     this.destroy();
        // }
    }

    @injectComponent(Collider, true)
    private _collider!: Collider;

    @injectComponent(RigidBody, true)
    private _rigidBody!: RigidBody;

    private _hit = false;

    private _onCollisionEnter(event: ICollisionEvent) {
        const thatCollider = event.otherCollider;
        if (thatCollider.getGroup() & (1 << PhysicsIndex.ENEMY)) {
            if (this._hit) {
                return;
            } else {
                this._hit = true;
                const damageable = thatCollider.node.getComponent(Damageable);
                if (!damageable) {
                    return;
                }
                damageable.applyDamage({
                    key: DamageKey.CH36_ATTACK,
                    source: this.source,
                    direction: math.Vec3.clone(this.node.forward),
                });
                this.node.destroy();
            }
        } else if (thatCollider.getGroup() & (1 << PhysicsIndex.DEFAULT)) {
        }
    }
}

/**
 * [1] Class member could be defined like this.
 * [2] Use `property` decorator if your want the member to be serializable.
 * [3] Your initialization goes here.
 * [4] Your update function goes here.
 *
 * Learn more about scripting: https://docs.cocos.com/creator/3.4/manual/zh/scripting/
 * Learn more about CCClass: https://docs.cocos.com/creator/3.4/manual/zh/scripting/ccclass.html
 * Learn more about life-cycle callbacks: https://docs.cocos.com/creator/3.4/manual/zh/scripting/life-cycle-callbacks.html
 */
