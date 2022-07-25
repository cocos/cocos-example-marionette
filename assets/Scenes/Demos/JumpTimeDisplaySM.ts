import { _decorator, Component, Node, animation } from "cc";
import { JumpTimerDisplay } from "./JumpTimerDisplay";
const { ccclass, property } = _decorator;

@ccclass("JumpTimeDisplaySM")
export class JumpTimeDisplaySM extends animation.StateMachineComponent {
    public onMotionStateEnter (controller: animation.AnimationController): void {
        controller.node.getComponent(JumpTimerDisplay)?.reset();
    }

    public onMotionStateExit (controller: animation.AnimationController): void {
        
    }
}
