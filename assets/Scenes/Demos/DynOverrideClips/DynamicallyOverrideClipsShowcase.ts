import { _decorator, Component, Node, find, RichText, KeyCode, Input, input, AnimationClip, animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DynamicallyOverrideClipsShowcase')
export class DynamicallyOverrideClipsShowcase extends Component {
    @property(AnimationClip)
    public originalGunAnimation: AnimationClip | null = null;

    @property({
        type: [AnimationClip],
        visible: function(this: DynamicallyOverrideClipsShowcase) {
            return !!this.originalGunAnimation;
        },
    })
    public gunAnimations: AnimationClip[] = [];

    start() {
        this._selectOperationState();
        input.on(Input.EventType.KEY_UP, (event) => {
            this._callback?.(event.keyCode);
        });
    }

    private _callback: null | ((keyCode: KeyCode) => void) = null;

    private _show(message: string) {
        const richText = find('Canvas/Words')?.getComponent(RichText);
        if (richText) {
            richText.string = message;
        }
    }

    private _selectOperationState() {
        this._show(
            `F - Change 🔫Gun Animations.`
        );
        this._callback = (keyCode: KeyCode) => {
            switch (keyCode) {
                default:
                    break;
                case KeyCode.KEY_F:
                    if (this.originalGunAnimation) {
                        this._selectGunAnimationState();
                    }
                    break;
            }
        }
    }

    private _selectGunAnimationState() {
        this._show([
            `${0} - ${this.originalGunAnimation?.name}`,
            ...this.gunAnimations.map((gunAnimation, index) => `${index + 1} - ${gunAnimation.name}`),
        ].join('\n'));
        this._callback = (keyCode: KeyCode) => {
            if (keyCode <= KeyCode.NUM_9 && keyCode >= KeyCode.NUM_0) {
                this._changeGun(keyCode - KeyCode.NUM_0);
                this._selectOperationState();
            } else if (keyCode <= KeyCode.DIGIT_9 && keyCode >= KeyCode.DIGIT_0) {
                this._changeGun(keyCode - KeyCode.DIGIT_0);
                this._selectOperationState();
            }
            switch (keyCode) {
                default:
                    this._selectOperationState();
                    break;
            }
        }
    }

    private _changeGun(index: number) {
        const { originalGunAnimation } = this;
        if (!originalGunAnimation) {
            return;
        }
        const gunAnimation = index === 0 ? originalGunAnimation : this.gunAnimations[index - 1];
        if (!gunAnimation) {
            return;
        }
        this.getComponent(animation.AnimationController)?.overrideClips_experimental(
            new Map([[originalGunAnimation, gunAnimation]]),
        );
    }
}


