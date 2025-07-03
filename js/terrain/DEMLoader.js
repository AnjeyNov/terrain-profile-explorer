import { Coordinates } from '../utils/Coordinates.js';
import { MathUtils } from '../utils/MathUtils.js';
import * as THREE from 'three';

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
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error('DEM tile not found:', url);
        return new Float32Array(256 * 256);
      }
      const blob = await resp.blob();
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
    // Переводим в меркатор
    const R = 6378137;
    const tSize = 256;
    const z = this.demZoom;
    const n = Math.pow(2, z);
    // Меркаторские координаты
    const x = R * (lon * Math.PI / 180);
    const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
    // Глобальные пиксели
    const origin = 2 * Math.PI * R / 2;
    const res = (2 * Math.PI * R) / (tSize * n);
    const pxAbs = (x + origin) / res;
    const pyAbs = (origin - y) / res;
    // tileXY
    const tx = Math.floor(pxAbs / tSize);
    const ty = Math.floor(pyAbs / tSize);
    // px/py внутри тайла
    const px = Math.floor(pxAbs) % tSize;
    const py = Math.floor(pyAbs) % tSize;
    const heights = await this.loadTerrariumTile(z, tx, ty);
    const idx = py * tSize + px;
    return heights[idx];
  }

  async applyDEMToGeometry(geometry, centerLon, centerLat, zoom, size = 100, exaggeration = 3.0) {
    const pos = geometry.attributes.position;
    const heightsAttr = new Float32Array(pos.count);
    const slopesAttr = new Float32Array(pos.count);
    const z = this.demZoom;
    const tSize = 256;
    const res0 = 2 * Math.PI * 6378137 / tSize;
    const origin = 2 * Math.PI * 6378137 / 2;
    const res = res0 / (2 ** z);
    const localTileCache = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const zPos = pos.getZ(i);
      // Новая схема: вычисляем смещение в метрах относительно центра
      const relX = -x / size;
      const relZ = zPos / size;
      // Центр в проекции Меркатора
      const centerMerc = Coordinates.lonLatToMerc(centerLon, centerLat);
      // Размер области в метрах
      const deltaLon = zoom;
      const deltaLat = zoom;
      const topLeft = Coordinates.lonLatToMerc(centerLon - deltaLon / 2, centerLat + deltaLat / 2);
      const bottomRight = Coordinates.lonLatToMerc(centerLon + deltaLon / 2, centerLat - deltaLat / 2);
      const widthMeters = bottomRight.x - topLeft.x;
      const heightMeters = topLeft.y - bottomRight.y;
      // Смещение в метрах
      const mx = topLeft.x + relX * widthMeters;
      const my = topLeft.y - relZ * heightMeters;
      // Обратно в lon/lat
      const { lon, lat } = Coordinates.mercToLonLat(mx, my);
      const { x: tx, y: ty } = Coordinates.mercToTileXY(
        Coordinates.lonLatToMerc(lon, lat).x,
        Coordinates.lonLatToMerc(lon, lat).y,
        z
      );
      const tileKey = `${z}/${tx}/${ty}`;
      let heights;
      if (localTileCache.has(tileKey)) {
        heights = localTileCache.get(tileKey);
      } else {
        heights = await this.loadTerrariumTile(z, tx, ty);
        localTileCache.set(tileKey, heights);
      }
      const { x: mxMerc, y: myMerc } = Coordinates.lonLatToMerc(lon, lat);
      const px = Math.floor((mxMerc + origin) / res) % tSize;
      const py = Math.floor((origin - myMerc) / res) % tSize;
      const idx = py * tSize + px;
      const h = heights[idx];
      const height = (h * exaggeration) / 1000;
      pos.setY(i, height);
      heightsAttr[i] = height;
      const col = px;
      const row = py;
      const slope = MathUtils.calculateSlope(heights, row, col, tSize);
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

  /**
   * Применяет DEM-текстуру (canvas) как рельеф к geometry.
   * @param {THREE.BufferGeometry} geometry
   * @param {HTMLCanvasElement} demCanvas - Canvas с DEM-тайлами (Terrarium RGB)
   * @param {number} exaggeration - коэффициент вертикального преувеличения
   * @param {object} [options] - { testChannel: null|'r'|'g'|'b', flipY: null|true|false, flipX: null|true|false }
   */
  async applyDEMTileTextureToGeometry(geometry, demCanvas, exaggeration = 3.0, options = {}) {
    const pos = geometry.attributes.position;
    const heightsAttr = new Float32Array(pos.count);
    const slopesAttr = new Float32Array(pos.count);
    const size = geometry.parameters.width || 100;
    const res = geometry.parameters.widthSegments + 1 || 256;
    const ctx = demCanvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, demCanvas.width, demCanvas.height).data;
    const testChannel = options.testChannel || null; // 'r', 'g', 'b' или null
    const flipY = options.flipY !== undefined ? options.flipY : true;
    const flipX = options.flipX !== undefined ? options.flipX : false;
    for (let i = 0; i < pos.count; i++) {
      // uv-координаты (от 0 до 1)
      const ix = i % res;
      const iz = Math.floor(i / res);
      let u = ix / (res - 1);
      let v = iz / (res - 1);
      if (flipX) u = 1 - u;
      if (flipY) v = 1 - v;
      // Пиксельные координаты DEM-канваса
      const px = Math.floor(u * (demCanvas.width - 1));
      const py = Math.floor(v * (demCanvas.height - 1));
      const idx = (py * demCanvas.width + px) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      let height;
      if (testChannel === 'r') height = r / 255;
      else if (testChannel === 'g') height = g / 255;
      else if (testChannel === 'b') height = b / 255;
      else height = (Coordinates.terrariumToMeters(r, g, b) * exaggeration) / 1000;
      pos.setY(i, height);
      heightsAttr[i] = height;
      slopesAttr[i] = 0; // slope можно не считать для теста
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.setAttribute('height', new THREE.BufferAttribute(heightsAttr, 1));
    geometry.setAttribute('slope', new THREE.BufferAttribute(slopesAttr, 1));
    return { heights: heightsAttr, slopes: slopesAttr };
  }
} 