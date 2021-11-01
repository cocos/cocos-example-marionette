import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';
import { CharacterStatus } from '../Controller/CharacterStatus';
import { injectComponent } from '../Utils/Component';
import { ShapeSelector } from '../Utils/Shape';
import { getForward } from '../Utils/NodeUtils';
import { MsAmoyController } from '../Controller/MsAmoyController';
import { Damageable } from './Damage/Damagable';
import { waitFor } from '../Utils/Misc';
import { DamageKey } from './Damage/DamageTable';
import { Damage } from './Damage/Damage';

@cc._decorator.ccclass('MonsterAI')
export class MonsterAI extends cc.Component {
    @cc._decorator.property
    public minIdleTime = 0.0;

    @cc._decorator.property
    public maxIdleTime = 0.0;

    @cc._decorator.property
    public minSpeed = 1.0;

    @cc._decorator.property
    public maxSpeed = 1.0;

    @cc._decorator.property
    public attackEnabled = true;

    @cc._decorator.property({
        visible: function(this: MonsterAI) {
            return this.attackEnabled;
        },
    })
    public seekingRadius = 0.0;

    @cc._decorator.property({
        visible: function(this: MonsterAI) {
            return this.attackEnabled;
        },
    })
    public attackRadius = 0.0;

    @cc._decorator.property({
        visible: function(this: MonsterAI) {
            return this.attackEnabled;
        },
    })
    public abandonDistance = 0.0;

    @cc._decorator.property
    public patrolEnabled = true;

    public declare shapeSelector: ShapeSelector;

    start () {
        this._damageable.on(Damageable.EventType.DAMAGE, (damage) => {
            this._onDamaged(damage);
        });
    }
    
    update (deltaTime: number) {
        while (!cc.math.approx(deltaTime, 0.0, 1e-5)) {
            if (this.attackEnabled) {
                if (!this._targetEnemy) {
                    switch (this._state) {
                        case AIState.IDLE:
                        case AIState.ROTATING:
                        case AIState.WALKING:
                        case AIState.STOPPING:
                            if (this._seek()) {
                                continue;
                            }
                            break;
                    }
                }
            }

            switch (this._state) {
                case AIState.NONE:
                    this._onStateNone();
                    break;
                case AIState.IDLE:
                    deltaTime = this._onStateIdle(deltaTime);
                    break;
                case AIState.ROTATING:
                    deltaTime = this._onStateRotate(deltaTime);
                    break;
                case AIState.WALKING:
                    deltaTime = this._onStateWalking(deltaTime);
                    break;
                case AIState.STOPPING:
                    deltaTime = this._onStateStopping(deltaTime);
                    break;
                case AIState.CHASING:
                    deltaTime = this._onStateChasing(deltaTime);
                    break;
                case AIState.ATTACKING:
                    deltaTime = this._onStateAttacking(deltaTime);
                    break;
            }
        }
    }

    public onAttackFinished() {
        this._attackFinished = true;
    }

    @injectComponent(CharacterStatus)
    private _characterStatus!: CharacterStatus;

    @injectComponent(cc.animation.AnimationController)
    public _animationController!: cc.animation.AnimationController;

    @injectComponent(Damageable)
    public _damageable!: Damageable;

    private _state: AIState = AIState.NONE;

    private _idleStateTimer = 0.0;

    private _walkStateTimer = 0.0;

    private _dest = new cc.math.Vec3();

    private _moveSpeed = 0.0;

    private _targetEnemy: MsAmoyController | null = null;

    private _attackFinished = true;

    private _onStateNone () {
        this._startIdle();
    }

    private _onStateIdle (deltaTime: number) {
        if (this._idleStateTimer > 0.0) {
            const t = Math.min(deltaTime, this._idleStateTimer);
            this._idleStateTimer -= t;
            return deltaTime - t;
        } else if (this.patrolEnabled) {
            this._startTurn();
            return deltaTime;
        } else {
            this._startIdle();
            return deltaTime;
        }
    }

    private _onStateWalking (deltaTime: number) {
        if (this._walkStateTimer > 0.0) {
            const t = Math.min(deltaTime, this._walkStateTimer);
            this._walkStateTimer -= deltaTime;
            return deltaTime - t;
        } else {
            this._startStop();
            return deltaTime;
        }
    }

    private _onStateStopping (deltaTime: number) {
        const stopTime = this._characterStatus.calculateAccelerationTime();
        const consumed = Math.min(deltaTime, stopTime);
        this._characterStatus.forceUpdate(consumed);
        if (consumed >= stopTime) {
            this._startIdle();
        }
        return deltaTime - consumed;
    }

    private _onStateRotate(deltaTime: number) {
        if (this._targetEnemy) {
            const amoyPosition = this._getAmoyPosition(this._targetEnemy);
            cc.math.Vec3.copy(this._dest, amoyPosition);
        }
        
        const {
            angle: currentAngle,
            axis: rotateAxis,
        } = this._getAngleAxisToTarget(this._dest);

        if (cc.math.approx(currentAngle, 0.0, 1e-5) || cc.math.approx(currentAngle, Math.PI, 1e-5)) {
            if (this._targetEnemy) {
                this._startChasing();
            } else {
                this._startWalk();
            }
            return deltaTime;
        }

        function onlyYRotation(node: cc.Node) {
            const euler = node.eulerAngles;
            return cc.math.approx(euler.x, 0.0, 1e-4) && cc.math.approx(euler.z, 0.0, 1e-4);
        }

        if (!onlyYRotation(this.node)) {
            debugger;
        }

        const rotateSpeed = cc.math.toRadian(180.0);
        const timeRequired = currentAngle / rotateSpeed;
        const time = Math.min(deltaTime, timeRequired);
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), rotateAxis, time * rotateSpeed);
        const rotation = cc.math.Quat.multiply(new cc.math.Quat(), this.node.worldRotation, q);
        this.node.setWorldRotation(rotation);

        if (!onlyYRotation(this.node)) {
            debugger;
        }
        
        return deltaTime - time;
    }

    private _onStateChasing(deltaTime: number) {
        const targetEnemy = this._targetEnemy!;
        const { angle } = this._getAngleAxisToTarget(this._getAmoyPosition(targetEnemy));
        if (!cc.math.approx(angle, 0.0, 1e-5)) {
            this._state = AIState.ROTATING;
            return deltaTime;
        }

        const distance = cc.math.Vec3.distance(this._getAmoyPosition(targetEnemy), this.node.worldPosition);
        if (distance <= this.attackRadius) {
            this._characterStatus.velocity = cc.math.Vec3.ZERO;
            this._startAttack();
            return 0.0;
        }
        
        if (distance >= this.abandonDistance) {
            this._targetEnemy = null;
            this._characterStatus.velocity = cc.math.Vec3.ZERO;
            this._startIdle();
            this._leaveChasing();
            return deltaTime;
        }

        this._characterStatus.velocity = cc.math.Vec3.multiplyScalar(
            new cc.math.Vec3(),
            getForward(this.node),
            0.8,
        );
        return 0.0;
    }

    private _onStateAttacking(deltaTime: number) {
        if (this._attackFinished) {
            this._state = AIState.CHASING;
            return deltaTime;
        } else {
            return 0.0;
        }
    }

    private _startIdle () {
        this._state = AIState.IDLE;
        this._idleStateTimer = cc.math.randomRange(this.minIdleTime, this.maxIdleTime);
    }

    private _startTurn () {
        this._state = AIState.ROTATING;

        const destGround = this.shapeSelector.shape.random();
        const dest = this._dest = new cc.Vec3(destGround.x, 0.0, destGround.y);
        
        this._moveSpeed = cc.randomRange(this.minSpeed, this.maxSpeed);
        this._walkStateTimer = cc.math.Vec3.distance(dest, this.node.worldPosition) / this._moveSpeed;
    }

    private _startWalk () {
        this._state = AIState.WALKING;
        this._characterStatus.localVelocity = cc.math.Vec3.multiplyScalar(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z, this._moveSpeed);
    }

    private _startStop () {
        this._state = AIState.STOPPING;
        this._characterStatus.localVelocity = cc.math.Vec3.ZERO;
    }

    private _startChasing() {
        this._state = AIState.CHASING;
        this._animationController.setValue('Combating', true);
    }

    private _leaveChasing() {
        this._animationController.setValue('Combating', false);
    }

    private _seek() {
        const amoyController = MsAmoyController.instance;
        if (!amoyController) {
            return false;
        }

        const targetPosition = amoyController.node.worldPosition;
        const distance = cc.math.Vec3.distance(targetPosition, this.node.worldPosition);
        if (distance > this.seekingRadius) {
            return false;
        }

        this._targetEnemy = amoyController;
        this._state = AIState.ROTATING;
        return true;
    }

    private _startAttack() {
        this._state = AIState.ATTACKING;
        this._animationController.setValue('Attack', true);
        this._attackFinished = false;
        const targetEnemy = this._targetEnemy;
        if (targetEnemy) {
            const damageable = targetEnemy.getComponent<Damageable>(Damageable);
            if (damageable) {
                (async () => {
                    await waitFor(0.5);
                    damageable.applyDamage({
                        key: DamageKey.CH36_ATTACK,
                        source: this,
                        direction: getForward(this.node),
                    });
                })();
            }
        }
    }

    private _onDamaged(damage: Damage) {
        this._animationController.setValue('Hit', true);
    }

    private _getAmoyPosition(target: MsAmoyController) {
        return target.node.worldPosition;
    }

    private _getAngleAxisToTarget(dest: cc.math.Vec3) {
        const destDir = cc.math.Vec3.subtract(
            new cc.math.Vec3(), dest, this.node.worldPosition);
        if (cc.math.Vec3.equals(destDir, cc.math.Vec3.ZERO, 1e-5)) {
            return {
                angle: 0.0,
                axis: cc.Vec3.ZERO,
            };
        }

        cc.math.Vec3.normalize(destDir, destDir);
        const currentDir = getForward(this.node);
        const rotateAxis = cc.math.Vec3.cross(new cc.math.Vec3(), currentDir, destDir);
        cc.math.Vec3.normalize(rotateAxis, rotateAxis);
        const currentAngle = cc.math.Vec3.angle(
            currentDir,
            destDir,
        );
        return {
            angle: currentAngle,
            axis: rotateAxis,
        };
    }
}

enum AIState {
    NONE,
    IDLE,
    WALKING,
    CHASING,
    STOPPING,
    ROTATING,
    ATTACKING,
}