import { _decorator, animation } from "cc";
import { MonsterAI, StateMachineEventType } from "../GamePlay/MonsterAI";
const { ccclass, property } = _decorator;

/**
 * Dispatch specific monster event when attached motion state exit.
 */
@ccclass("DispatchMonsterEvent")
export class DispatchMonsterEvent extends animation.StateMachineComponent {
    @_decorator.property({
        type: StateMachineEventType,
    })
    public eventType = StateMachineEventType.NONE;

    /**
     * Called when a motion state is going to be exited.
     * @param controller The animation controller it within.
     * @param motionStateStatus The status of the motion.
     */
    public onMotionStateExit (controller: animation.AnimationController, motionStateStatus: Readonly<animation.MotionStateStatus>): void {
        controller.node.getComponent(MonsterAI)?.dispatch(this.eventType);
    }
}
