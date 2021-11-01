
import { _decorator, Component, Node, math, animation } from 'cc';
import { CharacterStatus } from './CharacterStatus';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = MonsterCh36Controller
 * DateTime = Wed Oct 20 2021 18:25:10 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = MonsterCh36Controller.ts
 * FileBasenameNoExtension = MonsterCh36Controller
 * URL = db://assets/Source/Controller/MonsterCh36Controller.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */
 
@ccclass('MonsterCh36Controller')
export class MonsterCh36Controller extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    start () {
        this._charStatus = this.getComponent(CharacterStatus)!;
        this._animationController = this.getComponent(animation.AnimationController)!;
    }
    
    public update () {
        const { _charStatus: characterStatus } = this;
        const { localVelocity } = characterStatus;

        const speed = math.Vec3.len(localVelocity);
        this._animationController.setValue('Speed', speed);
    }

    private declare _charStatus: CharacterStatus;
    private declare _animationController: animation.AnimationController;
}

/**
 * [1] Class member could be defined like this.
 * [2] Use `property` decorator if your want the member to be serializable.
 * [3] Your initialization goes here.
 * [4] Your update function goes here.
 *
 * Learn more about scripting: https://docs.cocos.com/creator/3.4/manual/zh/scripting/
 * Learn more about CCClass: https://docs.cocos.com/creator/3.4/manual/zh/scripting/ccclass.html
 * Learn more about life-cycle callbacks: https://docs.cocos.com/creator/3.4/manual/zh/scripting/life-cycle-callbacks.html
 */
