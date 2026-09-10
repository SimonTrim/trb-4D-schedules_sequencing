import { LinkRoute } from '../types/schedule';

export const HEAD_H = 44;
export const ROW_H = 32;
export const STUB_OUT = 16;
export const STUB_IN = 12;

export interface BarGeom {
  x: number;
  w: number;
  right: number;
  cy: number;
}

export interface LinkGeometry {
  x1: number;
  y1: number;
  outX: number;
  midY: number;
  inX: number;
  y2: number;
  endX: number;
  path: string;
}

export function defaultMidT(fromIndex: number, toIndex: number, y1: number, y2: number): number {
  if (fromIndex === toIndex || y2 === y1) return 0.5;
  const gutterY = HEAD_H + fromIndex * ROW_H + (fromIndex < toIndex ? ROW_H : 0);
  return Math.max(0.12, Math.min(0.88, (gutterY - y1) / (y2 - y1)));
}

export function resolveRoute(
  fromIndex: number,
  toIndex: number,
  y1: number,
  y2: number,
  route?: LinkRoute,
): Required<LinkRoute> {
  return {
    stubOut: route?.stubOut ?? STUB_OUT,
    stubIn: route?.stubIn ?? STUB_IN,
    midT: route?.midT ?? defaultMidT(fromIndex, toIndex, y1, y2),
  };
}

export function computeLinkGeometry(
  from: BarGeom,
  to: BarGeom,
  fromIndex: number,
  toIndex: number,
  route: LinkRoute | undefined,
  labelW: number,
  chartRight: number,
): LinkGeometry {
  const x1 = from.right;
  const y1 = from.cy;
  const y2 = to.cy;
  const resolved = resolveRoute(fromIndex, toIndex, y1, y2, route);
  const outX = Math.max(x1 + 6, Math.min(chartRight - 4, x1 + resolved.stubOut));
  const inX = Math.max(labelW + 6, to.x - resolved.stubIn);
  const midY = y1 + (y2 - y1) * resolved.midT;
  const endX = to.x - 2;

  if (fromIndex === toIndex) {
    return {
      x1,
      y1,
      outX: Math.max(x1 + 6, endX),
      midY: y1,
      inX: endX,
      y2,
      endX,
      path: `M ${x1} ${y1} L ${endX} ${y2}`,
    };
  }

  return {
    x1,
    y1,
    outX,
    midY,
    inX,
    y2,
    endX,
    path: `M ${x1} ${y1} L ${outX} ${y1} L ${outX} ${midY} L ${inX} ${midY} L ${inX} ${y2} L ${endX} ${y2}`,
  };
}

export function routeFromGeometry(
  from: BarGeom,
  to: BarGeom,
  fromIndex: number,
  toIndex: number,
  outX: number,
  midY: number,
  inX: number,
): LinkRoute {
  const span = to.cy - from.cy;
  return {
    stubOut: Math.max(6, outX - from.right),
    stubIn: Math.max(4, to.x - inX),
    midT: span === 0 ? 0.5 : Math.max(0.08, Math.min(0.92, (midY - from.cy) / span)),
  };
}
