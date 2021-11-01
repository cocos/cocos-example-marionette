
import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;
import * as cc from 'cc';
import { toward } from './Utils/Math';
 
@ccclass('GraphVariableController')
export class GraphVariableController extends Component {
    @property([cc.EventHandler])
    public eventHandlers: cc.EventHandler[] = [];

    @property
    public label: string = '';

    @property
    public min: number = 0.0;

    @property
    public max: number = 1.0;

    @property
    public value: number = 0.5;

    start () {
        this._label = this.node.getChildByPath('Label')!.getComponent(cc.Label)!;
        this._slider = this.node.getChildByPath('Slider')!.getComponent(cc.Slider)!;
        this._editBox = this.node.getChildByPath('EditBox')!.getComponent(cc.EditBox)!;
        this._label.string = this.label;
        this._slider.progress = this._transformToSliderValue(this.value);
        this._updateEditBoxString(this._slider);
    }

    public setValue(value: number) {
        this.value = value;
        this._slider.progress = this._transformToSliderValue(value);
        this.onSliderProgressChanged(this._slider);
    }

    public update (deltaTime: number) {
        if (this._tween) {
            this.setValue(this._tween.update(deltaTime));
            if (this._tween.finished) {
                this._tween = null;
            }
        }
    }

    public onResetVelocitySlowly() {
        this._tween = createNumberTween(this.value, 0.0, 4.0);
    }

    public onResetButtonClicked() {
        this.setValue(0.0);
    }

    public onSliderProgressChanged(slider: cc.Slider) {
        this._updateEditBoxString(slider);
    }

    private declare _label: cc.Label;
    private declare _slider: cc.Slider;
    private declare _editBox: cc.EditBox;
    private _tween: NumberTween | null = null;

    private _transformSliderValue(sliderValue: number) {
        const { min, max } = this;
        return min + (max - min) * sliderValue;
    }

    private _transformToSliderValue(value: number) {
        const { min, max } = this;
        return (value - min) / (max - min);
    }

    private _updateEditBoxString(slider: cc.Slider) {
        const value = this._transformSliderValue(slider.progress);
        this.value = value;
        this._editBox.string = value.toString();
        for (const eventHandler of this.eventHandlers) {
            eventHandler.emit([value]);
        }
    }
}

type NumberTween = ReturnType<typeof createNumberTween>;

function createNumberTween(source: number, dest: number, speed: number) {
    let current = source;
    return {
        get finished() {
            return current === dest;
        },

        update: (deltaTime: number) => {
            current = toward(current, dest, speed * deltaTime);
            return current;
        },
    };
}
