import {clampY, dragTo, snapX} from '../launcherPosition';

const layout = {
  width: 400,
  height: 800,
  insets: {top: 50, right: 0, bottom: 30, left: 0},
};

describe('launcher position', () => {
  it('clamps y between the insets', () => {
    expect(clampY(-100, layout)).toBe(58);
    expect(clampY(10000, layout)).toBe(800 - 30 - 48 - 8);
    expect(clampY(300, layout)).toBe(300);
  });

  it('snaps x to the nearest edge', () => {
    expect(snapX(10, layout)).toBe(8);
    expect(snapX(300, layout)).toBe(400 - 48 - 8);
  });

  it('starts the second drag from the first drop position', () => {
    const first = dragTo({x: 344, y: 400}, {dx: -300, dy: 100}, layout);
    expect(first).toEqual({x: 8, y: 500});

    const second = dragTo(first, {dx: 50, dy: -200}, layout);
    expect(second).toEqual({x: 8, y: 300});

    const third = dragTo(second, {dx: 0, dy: 100}, layout);
    expect(third.y).toBe(400);
  });
});
