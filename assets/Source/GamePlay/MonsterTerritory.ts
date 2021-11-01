
import * as cc from 'cc';
import type { GraphicsGizmo } from '../Utils/GraphicsGizmo';
import { CharacterStatus } from '../Controller/CharacterStatus';
import { MonsterAI } from './MonsterAI';
import { ShapeSelector } from '../Utils/Shape';
import { EDITOR } from 'cc/env';

@cc._decorator.ccclass
@cc._decorator.executeInEditMode
export class MonsterTerritory extends cc.Component {
    @cc._decorator.property
    public capacity = 0;

    @cc._decorator.property
    public minScale = 1.0;

    @cc._decorator.property
    public maxScale = 1.0;

    @cc._decorator.property(cc.Prefab)
    public prefab!: cc.Prefab;

    @cc._decorator.property(ShapeSelector)
    public shapeSelector: ShapeSelector = new ShapeSelector();

    @cc._decorator.property({
        visible: function(this: MonsterTerritory) {
            return !!this.shapeSelector.shape.center;
        },
    })
    public useNodeAsShapeCenter = true;

    public start () {
        if (this.useNodeAsShapeCenter && this.shapeSelector.shape.center) {
            cc.math.Vec2.set(
                this.shapeSelector.shape.center,
                this.node.position.x,
                this.node.position.z,
            );
        }

        if (EDITOR) {
            if (this.useNodeAsShapeCenter) {
                this.node.on(cc.Node.EventType.TRANSFORM_CHANGED, () => {
                    if (this.shapeSelector) {
                        cc.math.Vec2.set(
                            this.shapeSelector.shape.center,
                            this.node.position.x,
                            this.node.position.z,
                        );
                    }
                });   
            }
            return;
        }
        
        if (!this.prefab) {
            return;
        }

        for (let iItem = 0; iItem < this.capacity; ++iItem) {
            const item = cc.instantiate(this.prefab);
            this.node.addChild(item);

            // Random position
            const positionGround = this.shapeSelector.shape.random();
            const position = cc.Vec3.set(new cc.Vec3(), positionGround.x, 0.0, positionGround.y);
            item.setPosition(position);

            // Random rotation
            const faceAngle = cc.randomRange(0.0, Math.PI * 2);
            const rotation = cc.Quat.rotateY(new cc.Quat(), item.rotation, faceAngle);
            item.setRotation(rotation);

            const scaleX = cc.randomRange(this.minScale, this.maxScale);
            const scaleY = cc.randomRange(this.minScale, this.maxScale);
            const scaleZ = cc.randomRange(this.minScale, this.maxScale);
            item.setScale(new cc.Vec3(scaleX, scaleY, scaleZ));

            const ai = item.getComponent<MonsterAI>(MonsterAI);
            if (ai) {
                ai.shapeSelector = this.shapeSelector;
            }
        }
    }

    public onGizmo (context: GraphicsGizmo) {
        this.shapeSelector.shape.onGizmo(context);
    }
}
