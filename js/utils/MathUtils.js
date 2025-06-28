
export class MathUtils {

  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static calculateSlope(heights, row, col, tileRes) {
    if (col <= 0 || col >= tileRes - 1 || row <= 0 || row >= tileRes - 1) {
      return 0;
    }

    const left = heights[row * tileRes + (col - 1)];
    const right = heights[row * tileRes + (col + 1)];
    const top = heights[(row - 1) * tileRes + col];
    const bottom = heights[(row + 1) * tileRes + col];

    const dx = (right - left) / 2;
    const dz = (bottom - top) / 2;
    
    return Math.sqrt(dx * dx + dz * dz) / 1000;
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