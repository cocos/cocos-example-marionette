import { _decorator, Component, Node, animation, input, Input, KeyCode } from 'cc';
import { injectComponent } from '../../../Source/Utils/Component';
const { ccclass, property } = _decorator;

const GRAPH_VAR_NAME_SPEED = 'Speed';

@ccclass('PreOverrideClipsNPC')
export class PreOverrideClipsNPC extends Component {
    start() {
        input.on(Input.EventType.KEY_UP, (event) => {
            switch (event.keyCode) {
                case KeyCode.KEY_F:
                    this._running = !this._running;
                    this._animationController.setValue('Speed', this._running ? 1.0 : 0.0);
                    break;
            }
        });
    }

    update(deltaTime: number) {

    }

    @injectComponent(animation.AnimationController)
    private _animationController!: animation.AnimationController;

    private _running = false;
}


