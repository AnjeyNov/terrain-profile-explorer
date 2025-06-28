import { Coordinates } from '../utils/Coordinates.js';
import { MathUtils } from '../utils/MathUtils.js';

export class DEMLoader {
  constructor() {
    this.tileCache = new Map();
    this.demZoom = 7;
    this.tileRes = 256;
  }

  async loadTerrariumTile(z, x, y) {
    const key = `${z}/${x}/${y}`;
    if (this.tileCache.has(key)) {
      return this.tileCache.get(key);
    }

    try {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
      const blob = await fetch(url).then(r => r.blob());
      const bmp = await createImageBitmap(blob);
      const cvs = new OffscreenCanvas(256, 256);
      const ctx = cvs.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const { data } = ctx.getImageData(0, 0, 256, 256);

      const heights = new Float32Array(256 * 256);
      for (let i = 0; i < heights.length; i++) {
        const r = data[i * 4 + 0];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        heights[i] = Coordinates.terrariumToMeters(r, g, b);
      }

      this.tileCache.set(key, heights);
      return heights;
    } catch (error) {
      console.error('Error loading DEM tile:', error);
      return new Float32Array(256 * 256);
    }
  }
  async heightAtLonLat(lon, lat) {
    const { x, y } = Coordinates.lonLatToMerc(lon, lat);
    const { x: tx, y: ty } = Coordinates.mercToTileXY(x, y, this.demZoom);
    const heights = await this.loadTerrariumTile(this.demZoom, tx, ty);

    const tSize = 256;
    const res0 = 2 * Math.PI * 6378137 / tSize;
    const origin = 2 * Math.PI * 6378137 / 2;
    const res = res0 / (2 ** this.demZoom);

    const px = Math.floor((x + origin) / res) % tSize;
    const py = Math.floor((origin - y) / res) % tSize;
    const idx = py * tSize + px;
    
    return heights[idx];
  }

  async applyDEMToGeometry(geometry, mx, mz, size = 100, exaggeration = 3.0) {
    const { lon, lat } = Coordinates.modelToLonLat(mx, mz, size);
    const { x, y } = Coordinates.lonLatToMerc(lon, lat);
    const { x: tx, y: ty } = Coordinates.mercToTileXY(x, y, this.demZoom);
    const heights = await this.loadTerrariumTile(this.demZoom, tx, ty);

    const pos = geometry.attributes.position;
    const heightsAttr = new Float32Array(pos.count);
    const slopesAttr = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const col = i % this.tileRes;
      const row = Math.floor(i / this.tileRes);
      const h = heights[row * this.tileRes + col];
      const height = (h * exaggeration) / 1000;

      pos.setY(i, height);
      heightsAttr[i] = height;

      const slope = MathUtils.calculateSlope(heights, row, col, this.tileRes);
      slopesAttr[i] = slope;
    }

    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    geometry.setAttribute('height', new THREE.BufferAttribute(heightsAttr, 1));
    geometry.setAttribute('slope', new THREE.BufferAttribute(slopesAttr, 1));

    return { heights: heightsAttr, slopes: slopesAttr };
  }

  async createHeightProfile(point1, point2, samples = 200) {
    const profile = [];
    
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const lon = MathUtils.lerp(point1.lon, point2.lon, t);
      const lat = MathUtils.lerp(point1.lat, point2.lat, t);
      const height = await this.heightAtLonLat(lon, lat);
      profile.push(height);
    }

    return profile;
  }

  clearCache() {
    this.tileCache.clear();
  }

  getCacheStats() {
    return {
      size: this.tileCache.size,
      keys: Array.from(this.tileCache.keys())
    };
  }
} 