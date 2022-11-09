import { KeyCode } from "cc";

export enum PredefinedAxisId {
    MoveForward,
    MoveRight,
}

export enum PredefinedActionId {
    Fire,
    IronSights,
    Jump,
    Reload,
    Crouch,
}

export const predefinedAxes: Record<PredefinedAxisId, { mappings: { keyCode: KeyCode, scale: number }[] }> = {
    [PredefinedAxisId.MoveForward]: { mappings: [
        { keyCode: KeyCode.KEY_W, scale: 1.0 },
        { keyCode: KeyCode.KEY_S, scale: -1.0 },
    ] },
    [PredefinedAxisId.MoveRight]: { mappings: [
        { keyCode: KeyCode.KEY_D, scale: 1.0 },
        { keyCode: KeyCode.KEY_A, scale: -1.0 },
    ] },
}

export const predefinedActions: Record<PredefinedActionId, { mappings: { keyCode: KeyCode }[] }> = {
    [PredefinedActionId.Fire]: { mappings: [{ keyCode: KeyCode.KEY_F }] },
    [PredefinedActionId.IronSights]: { mappings: [{ keyCode: KeyCode.KEY_Q }] },
    [PredefinedActionId.Jump]: { mappings: [{ keyCode: KeyCode.SPACE }] },
    [PredefinedActionId.Reload]: { mappings: [{ keyCode: KeyCode.KEY_R }] },
    [PredefinedActionId.Crouch]: { mappings: [{ keyCode: KeyCode.KEY_C }] },
};
