import { _decorator, animation, ParticleSystem } from "cc";
import { MsAmoyController } from "../Controller/MsAmoyController";
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = PlayEffect
 * DateTime = Wed Oct 20 2021 14:26:56 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = PlayEffect.ts
 * FileBasenameNoExtension = PlayEffect
 * URL = db://assets/Source/StateMachineComponents/PlayEffect.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */

@ccclass("PlayEffect")
export class PlayEffect extends animation.StateMachineComponent {
    
    onMotionStateEnter (controller: animation.AnimationController) {
        controller.getComponent(MsAmoyController)!.playAttackEffect();
        const component = controller.getComponentInChildren<ParticleSystem>(ParticleSystem);
        if (component) {
            component.clear();
            component.stop();
            component.play();
        }
    }
  
    onMotionStateExit (controller: animation.AnimationController) {
        const component = controller.getComponentInChildren<ParticleSystem>(ParticleSystem);
        component?.stop();
    }
}
