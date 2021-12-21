import { _decorator, animation } from "cc";
import { MsAmoyController } from "../Controller/MsAmoyController";
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = DisableMainCharacterMove
 * DateTime = Tue Dec 21 2021 18:09:50 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = DisableMainCharacterMove.ts
 * FileBasenameNoExtension = DisableMainCharacterMove
 * URL = db://assets/Source/StateMachineComponents/DisableMainCharacterMove.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */

@ccclass("DisableMainCharacterMove")
export class DisableMainCharacterMove extends animation.StateMachineComponent {
    /**
     * Called when a motion state right after it entered.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateEnter (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        controller.getComponent(MsAmoyController)!.lockMovement();
    }

    /**
     * Called when a motion state is going to be exited.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateExit (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        controller.getComponent(MsAmoyController)!.unlockMovement();
    }

    // /**
    //  * Called when a motion state updated except for the first and last frame.
    //  * @param controller The animation controller it within.
    //  * @param motionStateStatus The status of the motion.
    //  */
    // public onMotionStateUpdate (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
    //     // Can be overrode
    // }

    /**
     * Called when a state machine right after it entered.
     * @param controller The animation controller it within.
     */
    public onStateMachineEnter (controller: animation.AnimationController) {
        controller.getComponent(MsAmoyController)!.lockMovement();
    }

    /**
     * Called when a state machine right after it entered.
     * @param controller The animation controller it within.
     */
    public onStateMachineExit (controller: animation.AnimationController) {
        controller.getComponent(MsAmoyController)!.unlockMovement();
    }
}
