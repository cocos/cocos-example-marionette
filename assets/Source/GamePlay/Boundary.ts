
import { _decorator, Component, Node } from 'cc';
import { GraphicsGizmo } from '../Utils/GraphicsGizmo';
import { RectShape } from '../Utils/Shape';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = Boundary
 * DateTime = Tue Dec 07 2021 16:24:38 GMT+0800 (中国标准时间)
 * Author = shrinktofit
 * FileBasename = Boundary.ts
 * FileBasenameNoExtension = Boundary
 * URL = db://assets/Source/GamePlay/Boundary.ts
 * ManualUrl = https://docs.cocos.com/creator/3.4/manual/zh/
 *
 */
 
@ccclass('Boundary')
export class Boundary extends Component {
    public static instance: Boundary | null = null;

    @property
    shape: RectShape = new RectShape();

    start () {
        Boundary.instance = this;
    }

    // update (deltaTime: number) {
    //     // [4]
    // }

    public onGizmo (context: GraphicsGizmo) {
        this.shape.onGizmo(context);
    }
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
