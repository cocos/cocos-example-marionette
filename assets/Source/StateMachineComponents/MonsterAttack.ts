import { _decorator, animation } from "cc";
import { MonsterAI } from "../GamePlay/MonsterAI";
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = MonsterAttack
 * DateTime = Mon Oct 25 2021 17:58:32 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = MonsterAttack.ts
 * FileBasenameNoExtension = MonsterAttack
 * URL = db://assets/Source/StateMachineComponents/MonsterAttack.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */

@ccclass("MonsterAttack")
export class MonsterAttack extends animation.StateMachineComponent {
    
    onMotionStateEnter (controller: animation.AnimationController) {
    }
  
    onMotionStateExit (controller: animation.AnimationController) {
        const monsterAI = controller.node.getComponent<MonsterAI>(MonsterAI)!;
        monsterAI.onAttackFinished();
    }
}
