import * as THREE from 'three';

export class Coordinates {
  static lonLatToMerc(lon, lat) {
    const R = 6378137;
    const x = R * (lon * Math.PI / 180);
    const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
    return { x, y };
  }

  static mercToTileXY(x, y, z) {
    const origin = 2 * Math.PI * 6378137 / 2;
    const res = (2 * Math.PI * 6378137) / (256 * Math.pow(2, z));
    const px = (x + origin) / res;
    const py = (origin - y) / res;
    return { x: Math.floor(px / 256), y: Math.floor(py / 256) };
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