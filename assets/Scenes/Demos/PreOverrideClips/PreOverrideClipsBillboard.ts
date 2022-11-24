import { _decorator, Component, Node, RichText, find, Camera, Vec3, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PreOverrideClipsBillboard')
export class PreOverrideClipsBillboard extends Component {
    @property(Node)
    public billboard: Node | null = null;

    start() {

    }

    update(deltaTime: number) {
        if (!this.billboard || !this.billboard.parent) {
            return;
        }
        const camera = find('Main Camera')?.getComponent(Camera);
        if (!camera) {
            return;
        }
        const uiPos = camera.convertToUINode(this.node.worldPosition, this.billboard.parent);
        uiPos.y -= 100;
        this.billboard.position = uiPos;
    }
}


