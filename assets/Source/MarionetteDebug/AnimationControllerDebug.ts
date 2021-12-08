
import { _decorator, Component, Node, animation, Label, EditBox, Toggle, Button, UITransform, math, Layers, Prefab, instantiate, HorizontalTextAlignment, Overflow, EventHandler, error } from 'cc';
const { ccclass, property } = _decorator;
 
@ccclass('AnimationControllerDebug')
export class AnimationControllerDebug extends Component {
    @property(animation.AnimationController)
    get controller() {
        return this._controller;
    }

    set controller(value) {
        this._controller = value;
    }

    @property(Prefab)
    public variableName!: Prefab;

    @property(Prefab)
    public floatInput!: Prefab;

    @property(Prefab)
    public integerInput!: Prefab;

    @property(Prefab)
    public booleanInput!: Prefab;

    @property(Prefab)
    public triggerInput!: Prefab;

    protected start () {
        if (this._controller) {
            this._reset(this._controller);
        }
    }

    private _reset(controller: animation.AnimationController) {
        const variableList = this.node.getChildByPath('VariableList');
        const vars = controller.getVariables();
        for (const [varName, { type }] of vars) {
            const initialValue = controller.getValue(varName);

            const nameBase = `Variable - ${varName}`;

            const variableName = instantiate(this.variableName);
            variableName.name = `${nameBase} - Label`;
            const label = variableName.getComponentInChildren(Label)!;
            label.string = `${varName}`;
            variableList.addChild(variableName);

            let inputNode: Node;
            switch (type) {
                case animation.VariableType.INTEGER: {
                    inputNode = instantiate(this.integerInput);
                    const editBox = inputNode.getComponentInChildren(EditBox)!;
                    editBox.string = `${(initialValue as number).toString()}`;
                    editBox.node.on(EditBox.EventType.EDITING_DID_ENDED, () => {
                        let value = 0;
                        try {
                            value = parseInt(editBox.string);
                        } catch (err) {
                            error(err);
                            return;
                        }
                        controller.setValue(varName, value);
                    });
                    break;
                }
                case animation.VariableType.FLOAT: {
                    inputNode = instantiate(this.floatInput);
                    const editBox = inputNode.getComponentInChildren(EditBox)!;
                    editBox.string = `${(initialValue as number).toString()}`;
                    editBox.node.on(EditBox.EventType.EDITING_DID_ENDED, () => {
                        let value = 0;
                        try {
                            value = parseFloat(editBox.string);
                        } catch (err) {
                            error(err);
                            return;
                        }
                        controller.setValue(varName, value);
                    });
                    break;
                }
                case animation.VariableType.BOOLEAN: {
                    inputNode = instantiate(this.booleanInput);
                    const toggle = inputNode.getComponentInChildren(Toggle)!
                    toggle.isChecked = (initialValue as boolean);
                    toggle.node.on(Toggle.EventType.TOGGLE, () => {
                        controller.setValue(varName, toggle.isChecked);
                    });
                    break;
                }
                case animation.VariableType.TRIGGER: {
                    inputNode = instantiate(this.triggerInput);
                    const button = inputNode.getComponentInChildren(Button)!;
                    button.node.on(Button.EventType.CLICK, () => {
                        controller.setValue(varName, true);
                    });
                    break;
                }
            }
            inputNode.name = `${nameBase} - Input`;
            variableList.addChild(inputNode);
        }
    }

    @property
    private _controller: animation.AnimationController | null = null;

    private _onFloatInput() {
    }
}

