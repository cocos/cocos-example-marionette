import { _decorator, animation } from "cc";
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = RandomIdle
 * DateTime = Fri Oct 08 2021 13:18:33 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = RandomIdle.ts
 * FileBasenameNoExtension = RandomIdle
 * URL = db://assets/Source/RandomIdle.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */

@ccclass("RandomIdle")
export class RandomIdle extends animation.StateMachineComponent {
    
    onMotionStateEnter (controller: animation.AnimationController) {
        const idleShuffle = Math.random();
        controller.setValue('IdleShuffle', idleShuffle);
        console.debug(idleShuffle);
        controller.setValue('Idling', true);
    }
}
