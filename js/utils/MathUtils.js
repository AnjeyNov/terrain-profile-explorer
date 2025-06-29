export class MathUtils {

  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static calculateSlope(heights, row, col, tSize) {
    const get = (r, c) => {
      r = Math.max(0, Math.min(tSize - 1, r));
      c = Math.max(0, Math.min(tSize - 1, c));
      return heights[r * tSize + c];
    };
    const dzdx = (get(row, col + 1) - get(row, col - 1)) / 2;
    const dzdy = (get(row + 1, col) - get(row - 1, col)) / 2;
    return Math.sqrt(dzdx * dzdx + dzdy * dzdy);
  }

  static interpolateArray(start, end, count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      result.push(this.lerp(start, end, t));
    }
    return result;
  }
} 