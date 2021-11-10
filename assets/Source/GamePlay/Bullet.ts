
import { _decorator, Component, Node, Collider, ICollisionEvent, math, RigidBody } from 'cc';
import { MsAmoyController } from '../Controller/MsAmoyController';
import { injectComponent } from '../Utils/Component';
import { Damageable } from './Damage/Damagable';
import { DamageKey } from './Damage/DamageTable';
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

    // update (deltaTime: number) {
    //     // [4]
    // }

    @injectComponent(Collider)
    private _collider!: Collider;

    @injectComponent(RigidBody)
    private _rigidBody!: RigidBody;

    private _hit = false;

    private _onCollisionEnter(event: ICollisionEvent) {
        if (this._hit) {
            return;
        }
        this._hit = true;
        const thatCollider = event.otherCollider;
        const damageable = thatCollider.node.getComponent(Damageable);
        if (!damageable) {
            return;
        }
        damageable.applyDamage({
            key: DamageKey.CH36_ATTACK,
            source: this.source,
            direction: math.Vec3.clone(this.node.forward),
        });
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
