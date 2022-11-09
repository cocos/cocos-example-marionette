import { Director, director, input as engineInput, Input as EngineInput, KeyCode } from "cc";
import { predefinedActions, predefinedAxes } from "./Predefined";

export type AxisId = number;

export type ActionId = number;

class InputManager {
    constructor() {
        for (const [id, { mappings }] of Object.entries(predefinedAxes)) {
            this._addAxis(id as unknown as number, ...mappings);
        }

        for (const [id, { mappings }] of Object.entries(predefinedActions)) {
            this._addAction(id as unknown as number, ...mappings);
        }
        
        this._initialize();

        director.on(Director.EVENT_BEFORE_UPDATE, () => {
            this.update(0.0);
        });
    }

    public getAxisValue(axisId: AxisId) {
        return this._axes[axisId]?.axis.value ?? 0.0;
    }

    public getAction(actionId: ActionId) {
        return this._actions[actionId]?.triggered ?? false;
    }

    public update(deltaTime: number) {
        for (const [_, action] of Object.entries(this._actions)) {
            action.triggered = false;
            if (action.triggered2) {
                action.triggered = true;
                action.triggered2 = false;
            }
        }

        for (const [_, { axis, mappings }] of Object.entries(this._axes)) {
            let axisValue = 0.0;
            for (const mapping of mappings) {
                const pressed = this._pressedKeys.has(mapping.keyCode);
                if (pressed) {
                    axisValue += 1.0 * mapping.scale;
                }
            }
            axis.value = axisValue;
        }
    }

    private _addAxis(axisId: AxisId, ...mappings: { keyCode: KeyCode, scale: number }[]) {
        const axisRecord = this._axes[axisId] = new AxisRecord();
        for (const { keyCode, scale } of mappings) {
            axisRecord.mappings.push(new AxisMapping(keyCode, scale));
        }
    }

    private _addAction(actionId: ActionId, ...mappings: { keyCode: KeyCode }[]) {
        const actionRecord = this._actions[actionId] = new ActionRecord();
        for (const { keyCode } of mappings) {
            actionRecord.mappings.push(new ActionMapping(keyCode));
        }
    }

    private _initialize() {
        engineInput.on(EngineInput.EventType.KEY_DOWN, (event) => {
            this._pressedKeys.add(event.keyCode);
            for (const [_, action] of Object.entries(this._actions)) {
                if (action.mappings.some((mapping) => mapping.keyCode === event.keyCode)) {
                    action.triggered2 = true;
                }
            }
        });
        engineInput.on(EngineInput.EventType.KEY_UP, (event) => {
            this._pressedKeys.delete(event.keyCode);
        });
    }

    private _axes: Record<AxisId, AxisRecord> = {};
    private _actions: Record<ActionId, ActionRecord> = {};
    private _pressedKeys = new Set();
}

class Axis {
    public value = 0.0;
}

class AxisMapping {
    constructor(keyCode: KeyCode, scale: number) {
        this.keyCode = keyCode;
        this.scale = scale;
    }

    public keyCode: KeyCode;

    public scale: number;
}

class AxisRecord {
    public readonly axis = new Axis();

    public readonly mappings: AxisMapping[] = [];
}

class Action {
}

class ActionMapping {
    constructor(public keyCode: KeyCode) {

    }
}

class ActionRecord {
    public readonly action = new Action();

    public readonly mappings: ActionMapping[] = [];

    public triggered = false;

    public triggered2 = false;
}


export const globalInputManager = new InputManager();
