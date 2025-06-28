export class Coordinates {
  static lonLatToMerc(lon, lat) {
    const x = lon * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 20037508.34 / 180;
    return { x, y };
  }

  static mercToTileXY(x, y, z) {
    const t = 256;
    const res0 = 2 * Math.PI * 6378137 / t;
    const shift = 2 * Math.PI * 6378137 / 2;
    const res = res0 / 2 ** z;
    
    return {
      x: Math.floor((x + shift) / (res * t)),
      y: Math.floor((shift - y) / (res * t)),
    };
  }

  static modelToLonLat(mx, mz, size = 100) {
    return {
      lon: (mx / (size / 2)) * 180,
      lat: (mz / (size / 2)) * 85
    };
  }
  
  static terrariumToMeters(r, g, b) {
    return (r * 256 + g + b / 256) - 32768;
  }
} 