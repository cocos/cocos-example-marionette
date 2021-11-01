import { ccenum, math, _decorator } from "cc";
import type { GraphicsGizmo } from "./GraphicsGizmo";

export interface Shape {
    center?: math.Vec2;

    includes(point: math.Vec2): boolean;

    random(out?: math.Vec2): math.Vec2;

    onGizmo (context: GraphicsGizmo): void;
}

@_decorator.ccclass('CircleShape')
export class CircleShape implements Shape {
    @_decorator.property(math.Vec2)
    public center = new math.Vec2();

    @_decorator.property
    public radius = 0.0;

    public includes(point: math.Vec2) {
        return math.Vec2.distance(point, this.center) < this.radius;
    }

    public random(out?: math.Vec2) {
        out ??= new math.Vec2();
        const angle = math.randomRange(0.0, Math.PI * 2);
        const radius = math.randomRange(0.0, this.radius);
        const pX = radius * Math.cos(angle);
        const pY = radius * Math.sin(angle);
        return math.Vec2.add(out, this.center, new math.Vec2(pX, pY));
    }

    public onGizmo (context: GraphicsGizmo) {
        context.moveTo(new math.Vec3(this.center.x, 0.0, this.center.y));
        context.circle(this.radius);
    }
}

@_decorator.ccclass('RectShape')
export class RectShape implements Shape {
    @_decorator.property(math.Vec2)
    public center = new math.Vec2();

    @_decorator.property(math.Vec2)
    public size = new math.Size();

    public includes(point: math.Vec2) {
        return point.x >= (this.center.x - this.size.x / 2)
            && point.x <= (this.center.x + this.size.x / 2)
            && point.y >= (this.center.y - this.size.y / 2)
            && point.y <= (this.center.y + this.size.y / 2);
    }

    public random(out?: math.Vec2) {
        out ??= new math.Vec2();
        const x = this.size.width * math.randomRange(-0.5, 0.5);
        const y = this.size.height * math.randomRange(-0.5, 0.5);
        return math.Vec2.add(out, this.center, new math.Vec2(x, y));
    }

    public onGizmo (context: GraphicsGizmo) {
        const {
            center,
            size: {
                width,
                height,
            },
        } = this;
        const p = new math.Vec3();
        context.moveTo(math.Vec3.set(p, center.x - width / 2, 0.0, center.y - height / 2));
        context.moveTo(math.Vec3.set(p, center.x + width / 2, 0.0, center.y - height / 2));
        context.moveTo(math.Vec3.set(p, center.x + width / 2, 0.0, center.y + height / 2));
        context.moveTo(math.Vec3.set(p, center.x - width / 2, 0.0, center.y + height / 2));
    }
}

enum RangeType {
    CIRCLE,
    RECT,
}

ccenum(RangeType);

@_decorator.ccclass('ShapeSelector')
export class ShapeSelector {
    @_decorator.property({
        type: RangeType,
    })
    get type() {
        return ShapeSelector._rangeToType(this._range);
    }

    set type(value) {
        if (this.type === value) {
            return;
        }
        this._range = ShapeSelector._typeToRange(value);
    }

    @_decorator.property
    get shape() {
        return this._range;
    }

    private static _typeToRange(type: RangeType) {
        switch (type) {
            default:
            case RangeType.CIRCLE:
                return new CircleShape();
            case RangeType.RECT:
                return new RectShape();
        }
    }

    private static _rangeToType(range: ShapeSelector['_range']) {
        if (range instanceof RectShape) {
            return RangeType.RECT;
        } else {
            return RangeType.CIRCLE;
        }
    }

    @_decorator.property
    private _range: CircleShape | RectShape = new CircleShape();
}
