import { _decorator, Component, find, Node, Toggle } from 'cc';
import { Catcher } from './Catcher';
import { FootTracing } from './FootTracing';
const { ccclass, property } = _decorator;

@ccclass('DebugSwitch')
export class DebugSwitch extends Component {
    protected start(): void {
        this._debugging = this.getComponent(Toggle)?.isChecked ?? false;
        this._setDebugging();
    }

    public toggle() {
        this._debugging = !this._debugging;
        this._setDebugging();
    }

    private _debugging = false;

    private _setDebugging() {
        for (const component of this.node.scene.getComponentsInChildren(Catcher)) {
            component.debug = this._debugging;
        }
        for (const component of this.node.scene.getComponentsInChildren(FootTracing)) {
            component.debug = this._debugging;
        }
    }
}


