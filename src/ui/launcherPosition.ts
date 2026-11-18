import type {Insets} from '../types';
import {LAUNCHER_SIZE} from './theme';

export const MARGIN = 8;

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  width: number;
  height: number;
  insets: Insets;
}

export function clampY(y: number, l: Layout): number {
  return Math.min(
    Math.max(y, l.insets.top + MARGIN),
    l.height - l.insets.bottom - LAUNCHER_SIZE - MARGIN,
  );
}

/** The x of the screen edge nearest to `x`. */
export function snapX(x: number, l: Layout): number {
  return x + LAUNCHER_SIZE / 2 < l.width / 2
    ? l.insets.left + MARGIN
    : l.width - l.insets.right - LAUNCHER_SIZE - MARGIN;
}

/** Where a drag that began at `start` and moved by `g` ends: snapped x, clamped y. */
export function dragTo(
  start: Point,
  g: {dx: number; dy: number},
  l: Layout,
): Point {
  return {x: snapX(start.x + g.dx, l), y: clampY(start.y + g.dy, l)};
}
