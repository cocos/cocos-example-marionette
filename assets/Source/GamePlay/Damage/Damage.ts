import { Component, math } from "cc";
import { DamageKey } from "./DamageTable";

export interface Damage {
    key: DamageKey;
    source: Component;
    direction: Readonly<math.Vec3>;
}