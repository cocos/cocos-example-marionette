import * as cc from 'cc';
import { CharacterStatus } from '../Controller/CharacterStatus';
import { injectComponent } from '../Utils/Component';
import { ShapeSelector } from '../Utils/Shape';
import { Damageable } from './Damage/Damagable';
import { Damage } from './Damage/Damage';
import { StateMachine, StateMachineEventType } from './MonsterAI.StateMachine';

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
    public fightIdleTime = 3.0;

    @cc._decorator.property
    public attackEnabled = true;

    @cc._decorator.property({
        visible: function(this: MonsterAI) {
            return this.attackEnabled;
        },
        min: 0.0,
        max: 1.0,
        slide: true,
        step: 0.01,
    })
    public provocationProbability = 0.3;

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

    constructor (...args: ConstructorParameters<typeof cc.Component>) {
        super(...args);
    }

    start () {
        this._rigidBody = this.getComponent(cc.RigidBody) ?? this.getComponentInChildren(cc.RigidBody);

        const stateMachine = new StateMachine(
            this,
            this._animationController,
            this._characterStatus,
            this._rigidBody,
        );
        this._stateMachine = stateMachine;

        this._damageable.on(Damageable.EventType.DAMAGE, (damage) => {
            this._onDamaged(damage);
        });
    }
    
    update (deltaTime: number) {
        this._stateMachine.update(deltaTime);
    }

    public dispatch(type: StateMachineEventType) {
        this._stateMachine.dispatch(type);
    }

    @injectComponent(CharacterStatus)
    private _characterStatus!: CharacterStatus;

    @injectComponent(cc.animation.AnimationController)
    public _animationController!: cc.animation.AnimationController;

    @injectComponent(Damageable)
    public _damageable!: Damageable;

    private _rigidBody: cc.RigidBody | null = null;

    private declare _stateMachine: StateMachine;

    public _onDamaged(damage: Damage) {
        this._stateMachine.setHit(damage);
    }
}

export { StateMachineEventType } from './MonsterAI.StateMachine';
