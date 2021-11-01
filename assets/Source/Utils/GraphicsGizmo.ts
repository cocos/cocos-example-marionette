import * as cc from 'cc';
import { EDITOR } from 'cc/env';

@cc._decorator.ccclass
@cc._decorator.executeInEditMode
export class GraphicsGizmo extends cc.Component {
    @cc._decorator.property(cc.Material)
    public material!: cc.Material;

    public start () {
        const scene = cc.director.getScene();
        if (!scene) {
            return;
        }
        const root = cc.director.root;
        if (!root) {
            return;
        }
        const renderScene = scene.renderScene;
        if (!renderScene) {
            return;
        }

        const model = root.createModel(cc.renderer.scene.Model);
        model.transform = this.node;
        model.node = this.node;
        model.initialize();

        renderScene.addModel(model);

        this._model = model;

        this._renderingSubMesh = new UpdatableRenderingSubMesh({
            primitiveMode: cc.gfx.PrimitiveMode.LINE_LIST,
            attributes: [new cc.gfx.Attribute(
                cc.gfx.AttributeName.ATTR_POSITION,
                cc.gfx.Format.RGB32F,
                false,
                0,
                false,
            )],
            vertexBufferInfos: [{
                stride: 4 * 3,
            }],
        }, 64, root.device);
        this._model.initSubModel(0, this._renderingSubMesh.mesh, this.material);
    }

    public onDestroy() {
        return this.clear();
    }

    public update () {
        if (EDITOR) {
            const components: Array<cc.Component & {
                onGizmo? (context: GraphicsGizmo): void;
            }> = this.node.scene.getComponentsInChildren(cc.Component);
            for (const component of components) {
                if (component.enabled && component.node.activeInHierarchy) {
                    component.onGizmo?.(this);
                }
            }
        }

        if (this._usedVertexCount !== 0) {
            this._renderingSubMesh.sync();
        }

        this._usedVertexCount = 0;
    }

    public clear () {
        this._usedVertexCount = 0;
    }

    public moveTo (point: Readonly<cc.math.Vec3>) {
        cc.math.Vec3.copy(this._brushPosition, point);
    }

    public lineTo (point: Readonly<cc.math.Vec3>) {
        this._addVertex(this._brushPosition);
        this._addVertex(point);
    }

    public circle (radius: number, segments = 30) {
        const angleStep = 360.0 / segments;
        const p = new cc.math.Vec3();
        for (let iSegment = 0; iSegment < segments; ++iSegment) {
            const angle = cc.math.toRadian(angleStep * iSegment);
            const nextAngle = cc.math.toRadian(angleStep * (iSegment + 1));

            cc.math.Vec3.copy(p, this._brushPosition);
            p.x += radius * Math.cos(angle);
            p.z += radius * Math.sin(angle);
            this._addVertex(p);

            cc.math.Vec3.copy(p, this._brushPosition);
            p.x += radius * Math.cos(nextAngle);
            p.z += radius * Math.sin(nextAngle);
            this._addVertex(p);
        }
    }

    private _brushPosition: cc.math.Vec3 = new cc.math.Vec3();
    private declare _renderingSubMesh: UpdatableRenderingSubMesh;
    private _usedVertexCount = 0;
    private declare _model: cc.renderer.scene.Model;

    private _addVertex (position: cc.math.Vec3) {
        if (this._usedVertexCount >= this._renderingSubMesh.vertexCount) {
            this._renderingSubMesh.resize(Math.floor(this._renderingSubMesh.vertexCount * 1.5));
            this._model.initSubModel(0, this._renderingSubMesh.mesh, this.material);
        }

        cc.math.Vec3.toArray(new Float32Array(
            this._renderingSubMesh.buffers[0],
            Float32Array.BYTES_PER_ELEMENT * 3 * this._usedVertexCount,
            3,
        ), position);

        ++this._usedVertexCount;
    }
}

interface UpdatableRenderingSubMeshCreateInfo {
    primitiveMode: cc.gfx.PrimitiveMode;
    attributes: cc.gfx.Attribute[];
    vertexBufferInfos: Array<{
        stride: number;
    }>;
}

class UpdatableRenderingSubMesh {
    constructor (createInfo: UpdatableRenderingSubMeshCreateInfo, vertexCount: number, device: cc.gfx.Device) {
        this._device = device;
        this._createInfo = createInfo;
        const { localBuffers, renderingSubMesh } = this._create(vertexCount);
        this._localBuffers = localBuffers;
        this._renderingSubMesh = renderingSubMesh;
        this._vertexCount = vertexCount;
    }

    get vertexCount () {
        return this._vertexCount;
    }

    get buffers () {
        return this._localBuffers;
    }

    get mesh () {
        return this._renderingSubMesh;
    }

    public sync () {
        this._localBuffers.forEach((localBuffer, index) => {
            const vertexBuffer = this._renderingSubMesh.vertexBuffers[index];
            vertexBuffer.update(localBuffer);
        });
    }

    public resize (vertexCount: number) {
        this._renderingSubMesh.destroy();
        const localBuffers = this._localBuffers;

        const {
            renderingSubMesh,
            localBuffers: newLocalBuffers,
        } = this._create(vertexCount);

        const commonVertexCount = Math.min(vertexCount, this._vertexCount);
        this._createInfo.vertexBufferInfos.forEach(({ stride }, iBuffer) => {
            const byteLength = stride * commonVertexCount;
            const newLocalBuffer = newLocalBuffers[iBuffer];
            const localBuffer = localBuffers[iBuffer];
            new Uint8Array(newLocalBuffer, 0, byteLength).set(new Uint8Array(localBuffer, 0, byteLength));
        });

        this._vertexCount = vertexCount;
        this._renderingSubMesh = renderingSubMesh;
        this._localBuffers = newLocalBuffers;
    }

    private _renderingSubMesh: cc.RenderingSubMesh;
    private _localBuffers: ArrayBuffer[];
    private _device: cc.gfx.Device;
    private _createInfo: UpdatableRenderingSubMeshCreateInfo;
    private _vertexCount: number;

    private _create (vertexCount: number) {
        const { _createInfo: createInfo } = this;
        const localBuffers = createInfo.vertexBufferInfos.map(({ stride }) => {
            return new ArrayBuffer(stride * vertexCount);
        });
        const vertexBuffers = createInfo.vertexBufferInfos.map(({ stride }) => {
            const vertexBuffer = this._device.createBuffer(new cc.gfx.BufferInfo(
                cc.gfx.BufferUsageBit.VERTEX,
                cc.gfx.MemoryUsageBit.DEVICE,
                stride * vertexCount,
                stride,
            ));
            return vertexBuffer;
        });
        const renderingSubMesh = new cc.RenderingSubMesh(
            vertexBuffers,
            createInfo.attributes,
            createInfo.primitiveMode,
        );
        return {
            localBuffers,
            renderingSubMesh,
        };
    }
}
