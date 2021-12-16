import * as cc from 'cc';
import { CharacterStatus } from '../Controller/CharacterStatus';
import { getForward } from '../Utils/NodeUtils';
import { MsAmoyController } from '../Controller/MsAmoyController';
import { Damageable } from './Damage/Damagable';
import { waitFor } from '../Utils/Misc';
import { DamageKey } from './Damage/DamageTable';
import { Damage } from './Damage/Damage';
import { MonsterAI } from './MonsterAI';

class StateMachineData {
    public _targetEnemy: MsAmoyController | null = null;

    constructor(
        private _component: MonsterAI,
        public _animationController: cc.animation.AnimationController,
        public _characterStatus: CharacterStatus,
        public _rigidBody: cc.RigidBody | null,
    ) {

    }

    public _seek(stateMachine: StateMachine) {
        const amoyController = MsAmoyController.instance;
        if (!amoyController) {
            return false;
        }

        const targetPosition = amoyController.node.worldPosition;
        const distance = cc.math.Vec3.distance(targetPosition, this._component.node.worldPosition);
        if (distance > this._component.seekingRadius) {
            return false;
        }

        this._targetEnemy = amoyController;
        stateMachine.transition(AIState.ROTATING);
        return true;
    }

    public _isOrientingToTarget(angle: number) {
        return cc.math.approx(angle, 0.0, 1e-5);
    }

    public _getAmoyPosition(target: MsAmoyController) {
        return target.node.worldPosition;
    }

    public _getAngleAxisToTarget(dest: cc.math.Vec3) {
        const destDir = cc.math.Vec3.subtract(
            new cc.math.Vec3(), dest, this._component.node.worldPosition);
        if (cc.math.Vec3.equals(destDir, cc.math.Vec3.ZERO, 1e-5)) {
            return {
                angle: 0.0,
                axis: cc.Vec3.ZERO,
            };
        }

        cc.math.Vec3.normalize(destDir, destDir);
        const currentDir = getForward(this._component.node);
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

interface StateContext {
    stateMachine: StateMachine;
    component: MonsterAI;
    data: StateMachineData;
}

export enum StateMachineEventType {
    NONE,

    ATTACK_END,

    HIT_END,
}

cc.ccenum(StateMachineEventType);

class State {
    public context: StateContext;

    constructor (context: StateContext) {
        this.context = context;
    }

    public enter(...args: unknown[]) {

    }

    public exit() {

    }

    public on(type: StateMachineEventType) {
    }

    public update(deltaTime: number): number {
        return 0.0;
    }
}

class IdleState extends State {
    public enter() {
        this._timer = cc.math.randomRange(this.context.component.minIdleTime, this.context.component.maxIdleTime);
    }

    public update (deltaTime: number) {
        if (this._timer > 0.0) {
            const t = Math.min(deltaTime, this._timer);
            this._timer -= t;
            return deltaTime - t;
        } else if (this.context.component.patrolEnabled) {
            this.context.stateMachine.transition(AIState.ROTATING);
            return deltaTime;
        } else {
            this.context.stateMachine.transition(AIState.IDLE);
            return deltaTime;
        }
    }

    private _timer = 0.0;
}

class TurnState extends State {
    public enter() {
        const destGround = this.context.component.shapeSelector.shape.random();
        this._dest = new cc.Vec3(destGround.x, 0.0, destGround.y);
    }

    public update(deltaTime: number) {
        if (this.context.data._targetEnemy) {
            const amoyPosition = this.context.data._getAmoyPosition(this.context.data._targetEnemy);
            cc.math.Vec3.copy(this._dest, amoyPosition);
        }
        
        const {
            angle: currentAngle,
            axis: rotateAxis,
        } = this.context.data._getAngleAxisToTarget(this._dest);

        if (this.context.data._isOrientingToTarget(currentAngle)) {
            const speed = cc.randomRange(this.context.component.minSpeed, this.context.component.maxSpeed);
            const time = cc.math.Vec3.distance(this._dest, this.context.component.node.worldPosition) / speed;
            if (this.context.data._targetEnemy) {
                this.context.stateMachine.transition(AIState.CHASING);
            } else {
                this.context.stateMachine.transition(AIState.WALKING, speed, time);
            }
            return deltaTime;
        }

        function onlyYRotation(node: cc.Node) {
            const euler = node.eulerAngles;
            return cc.math.approx(euler.x, 0.0, 1e-4) && cc.math.approx(euler.z, 0.0, 1e-4);
        }

        if (!onlyYRotation(this.context.component.node)) {
            //debugger;
        }

        const rotateSpeed = cc.math.toRadian(180.0);
        const timeRequired = currentAngle / rotateSpeed;
        const time = Math.min(deltaTime, timeRequired);
        const q = cc.math.Quat.fromAxisAngle(new cc.math.Quat(), rotateAxis, time * rotateSpeed);
        const rotation = cc.math.Quat.multiply(new cc.math.Quat(), this.context.component.node.worldRotation, q);
        if (this.context.data._rigidBody  && this.context.data._rigidBody.type !== cc.RigidBody.Type.KINEMATIC) {
            // this._rigidBody.setAngularVelocity();
        } else {
            this.context.component.node.setWorldRotation(rotation);
        }

        if (!onlyYRotation(this.context.component.node)) {
            //debugger;
        }
        
        return deltaTime - time;
    }

    private _dest = new cc.Vec3();
}

class WalkState extends State {
    public enter(speed: number, time: number) {
        this._timer = time;
        this.context.data._characterStatus.localVelocity = cc.math.Vec3.multiplyScalar(new cc.math.Vec3(), cc.math.Vec3.UNIT_Z, speed);
    }

    public exit(): void {
        this.context.data._characterStatus.velocity = cc.math.Vec3.ZERO;
    }

    public update(deltaTime: number) {
        if (this._timer > 0.0) {
            const t = Math.min(deltaTime, this._timer);
            this._timer -= deltaTime;
            return deltaTime - t;
        } else {
            this.context.stateMachine.transition(AIState.STOPPING);
            return deltaTime;
        }
    }

    private _timer = 0.0;
}

class StopState extends State {
    public enter() {
        this.context.data._characterStatus.localVelocity = cc.math.Vec3.ZERO;
    }

    public update (deltaTime: number) {
        const stopTime = this.context.data._characterStatus.calculateAccelerationTime();
        const consumed = Math.min(deltaTime, stopTime);
        this.context.data._characterStatus.forceUpdate(consumed);
        if (consumed >= stopTime) {
            this.context.stateMachine.transition(AIState.IDLE);
        }
        return deltaTime - consumed;
    }
}

class ChaseState extends State {
    public enter() {
        this.context.data._animationController.setValue('Combating', true);
    }

    public update(deltaTime: number) {
        const targetEnemy = this.context.data._targetEnemy!;
        const { angle } = this.context.data._getAngleAxisToTarget(this.context.data._getAmoyPosition(targetEnemy));
        if (!this.context.data._isOrientingToTarget(angle)) {
            this.context.stateMachine.transition(AIState.ROTATING);
            return deltaTime;
        }

        const distance = cc.math.Vec3.distance(this.context.data._getAmoyPosition(targetEnemy), this.context.component.node.worldPosition);
        if (distance <= this.context.component.attackRadius) {
            this.context.data._characterStatus.velocity = cc.math.Vec3.ZERO;
            this.context.stateMachine.transition(AIState.ATTACKING);
            return 0.0;
        }
        
        if (distance >= this.context.component.abandonDistance) {
            this.context.data._targetEnemy = null;
            this.context.data._characterStatus.velocity = cc.math.Vec3.ZERO;
            this.context.data._animationController.setValue('Combating', false);
            this.context.stateMachine.transition(AIState.IDLE);
            return deltaTime;
        }

        this.context.data._characterStatus.velocity = cc.math.Vec3.multiplyScalar(
            new cc.math.Vec3(),
            getForward(this.context.component.node),
            0.8,
        );
        return 0.0;
    }

    public exit(): void {
        this.context.data._characterStatus.velocity = cc.math.Vec3.ZERO;
    }
}

class AttackState extends State {
    public enter() {
        const shouldPerformProvocation = Math.random() < this.context.component.provocationProbability;
        if (shouldPerformProvocation) {
            this.context.data._animationController.setValue('ProvocativelyAttack', true);
        } else {
            this.context.data._animationController.setValue('Attack', true);
        }
        this._isProvoking = shouldPerformProvocation;
        if (!shouldPerformProvocation) {
            const targetEnemy = this.context.data._targetEnemy;
            if (targetEnemy) {
                const damageable = targetEnemy.getComponent<Damageable>(Damageable);
                if (damageable) {
                    (async () => {
                        await waitFor(0.5);
                        damageable.applyDamage({
                            key: DamageKey.CH36_ATTACK,
                            source: this.context.component,
                            direction: getForward(this.context.component.node),
                        });
                    })();
                }
            }
        }
    }

    public update(deltaTime: number) {
        return 0.0;
    }

    public on(type: StateMachineEventType) {
        if (type === StateMachineEventType.ATTACK_END) {
            this.context.stateMachine.transition(AIState.CHASING);
        }
    }

    private _isProvoking = false;
}

class HitState extends State {
    public enter() {
        this.context.data._animationController.setValue('Hit', true);
    }

    public on(type: StateMachineEventType) {
        if (type === StateMachineEventType.HIT_END) {
            this.context.stateMachine.transition(AIState.FIGHT_IDLE);
        }
    }
}

class FightIdleState extends State {
    public enter(): void {
        this.context.data._animationController.setValue('Combating', true);
        this._timer = this.context.component.fightIdleTime;
    }

    public update(deltaTime: number): number {
        if (this.context.data._targetEnemy) {
            this.context.stateMachine.transition(AIState.CHASING);
            return deltaTime;
        }
        const consume = Math.min(deltaTime, this._timer);
        const timerRemain = this._timer -= consume;
        const inputRemain = deltaTime - consume;
        if (timerRemain <= 0) {
            this.context.data._animationController.setValue('Combating', false);
            this.context.stateMachine.transition(AIState.IDLE);
        }
        return inputRemain;
    }

    private _timer = 0.0;
}

class EntryState extends State {
    public update(deltaTime: number) {
        this.context.stateMachine.transition(AIState.IDLE);
        return deltaTime;
    }
}

export class StateMachine {
    constructor(...args: ConstructorParameters<typeof StateMachineData>) {
        const component = args[0];
        this._component = component;
        const data = new StateMachineData(...args);
        this._data = data;
        const context = {
            component,
            data,
            stateMachine: this,
        };
        this._states = {
            [AIState.ATTACKING]: new AttackState(context),
            [AIState.CHASING]: new ChaseState(context),
            [AIState.HIT]: new HitState(context),
            [AIState.IDLE]: new IdleState(context),
            [AIState.NONE]: new EntryState(context),
            [AIState.ROTATING]: new TurnState(context),
            [AIState.STOPPING]: new StopState(context),
            [AIState.WALKING]: new WalkState(context),
            [AIState.FIGHT_IDLE]: new FightIdleState(context),
        };
    }

    get currentStateKind() {
        return this._currentStateKind;
    }

    get currentState() {
        return this._states[this._currentStateKind];
    }

    public transition (kind: AIState, ...args: unknown[]) {
        this.currentState.exit();
        const state = this._states[kind];
        // @ts-ignore
        state.enter(...args);
        this._currentStateKind = kind;
    }

    public update(deltaTime: number) {
        while (!cc.math.approx(deltaTime, 0.0, 1e-5)) {
            if (this._component.attackEnabled) {
                if (!this._data._targetEnemy) {
                    switch (this.currentStateKind) {
                        case AIState.IDLE:
                        case AIState.ROTATING:
                        case AIState.WALKING:
                        case AIState.STOPPING:
                            if (this._data._seek(this)) {
                                continue;
                            }
                            break;
                    }
                }
            }

            const currentState = this.currentState;
            deltaTime = currentState.update(deltaTime);
        }
    }

    public dispatch(type: StateMachineEventType) {
        this.currentState.on(type);
    }

    public setHit(damage: Damage) {
        this.transition(AIState.HIT);
    }

    private _states: Record<AIState, State>;

    private _currentStateKind = AIState.NONE;

    private _component: MonsterAI;

    private _data: StateMachineData;
}

enum AIState {
    NONE,
    IDLE,
    WALKING,
    CHASING,
    STOPPING,
    ROTATING,
    ATTACKING,
    HIT,
    FIGHT_IDLE,
}