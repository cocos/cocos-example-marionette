import { _decorator, Component, Node, find, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('JumpTimerDisplay')
export class JumpTimerDisplay extends Component {
    @property
    public total = 0.5;

    reset() {
        this._timer = 0.0;
    }

    update(deltaTime: number) {
        const time = this._timer = Math.min(this._timer + deltaTime, this.total);
        const label = find('Canvas/JumpTimer')?.getComponent(Label);
        if (label) {
            label.string = `Jump transition progress: ${time.toFixed(2)}s/${this.total.toFixed(2)}s.`;
        }
    }

    private _timer = this.total;
}


