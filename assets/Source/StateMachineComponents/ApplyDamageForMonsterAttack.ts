import { _decorator, animation } from "cc";
import { MonsterAI, StateMachineEventType } from "../GamePlay/MonsterAI";
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = ApplyDamageForMonsterAttack
 * DateTime = Tue Dec 21 2021 19:11:15 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = ApplyDamageForMonsterAttack.ts
 * FileBasenameNoExtension = ApplyDamageForMonsterAttack
 * URL = db://assets/Source/StateMachineComponents/ApplyDamageForMonsterAttack.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */

@ccclass("ApplyDamageForMonsterAttack")
export class ApplyDamageForMonsterAttack extends animation.StateMachineComponent {
    /**
     * Called when a motion state right after it entered.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateEnter (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        this._damageApplied = false;
    }

    /**
     * Called when a motion state is going to be exited.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateExit (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        this._tryApplyDamage(controller, motionStateStatus);
    }

    /**
     * Called when a motion state updated except for the first and last frame.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateUpdate (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        this._tryApplyDamage(controller, motionStateStatus);
    }

    // /**
    //  * Called when a state machine right after it entered.
    //  * @param controller The animation controller it within.
    //  */
    // public onStateMachineEnter (controller: animation.AnimationController) {
    //     // Can be overrode
    // }

    // /**
    //  * Called when a state machine right after it entered.
    //  * @param controller The animation controller it within.
    //  */
    // public onStateMachineExit (controller: animation.AnimationController) {
    //     // Can be overrode
    // }

    private _damageApplied = false;

    private _tryApplyDamage(controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>) {
        if (!this._damageApplied && motionStateStatus.progress > 0.3) {
            this._damageApplied = true;
            controller.node.getComponent(MonsterAI)?.dispatch(StateMachineEventType.ATTACK_APPLY_DAMAGE);
        }
    }
}
