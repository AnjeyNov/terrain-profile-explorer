import * as THREE from 'three';

export class TerrainTextures {
  constructor() {
    this.textures = {};
    this.normalMaps = {};
    this.init();
  }

  init() {
    this.createProceduralTextures();
    this.createNormalMaps();
  }

  createProceduralTextures() {
    const textureTypes = ['water', 'sand', 'grass', 'rock', 'snow'];

    textureTypes.forEach(type => {
      this.textures[type] = this.createProceduralTexture(type);
    });
  }

  createProceduralTexture(type, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);

      let r, g, b;

      switch (type) {
        case 'water':
          r = 20 + Math.sin(x * 0.04) * Math.cos(y * 0.04) * 10;
          g = 60 + Math.sin(x * 0.06) * Math.cos(y * 0.05) * 15;
          b = 120 + Math.sin(x * 0.03) * Math.cos(y * 0.07) * 20;
          break;
        case 'sand':
          r = 220;
          g = 205;
          b = 135;
          break;
        case 'grass':
          r = 50 + Math.sin(x * 0.08) * Math.cos(y * 0.08) * 15;
          g = 120 + Math.sin(x * 0.1) * Math.cos(y * 0.07) * 20;
          b = 30 + Math.sin(x * 0.09) * Math.cos(y * 0.09) * 8;
          break;
        case 'rock':
          r = 100 + Math.sin(x * 0.07) * Math.cos(y * 0.07) * 18;
          g = 100 + Math.sin(x * 0.09) * Math.cos(y * 0.06) * 18;
          b = 100 + Math.sin(x * 0.08) * Math.cos(y * 0.08) * 18;
          break;
        case 'snow':
          r = 220 + Math.sin(x * 0.04) * Math.cos(y * 0.04) * 7;
          g = 220 + Math.sin(x * 0.05) * Math.cos(y * 0.03) * 7;
          b = 240 + Math.sin(x * 0.03) * Math.cos(y * 0.06) * 5;
          break;
      }

      imageData.data[i] = Math.max(0, Math.min(255, r));     // R
      imageData.data[i + 1] = Math.max(0, Math.min(255, g)); // G
      imageData.data[i + 2] = Math.max(0, Math.min(255, b)); // B
      imageData.data[i + 3] = 255;                           // A
    }

    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }

  createNormalMaps() {
    const intensities = {
      water: 0.1,
      sand: 0.3,
      grass: 0.5,
      rock: 0.8,
      snow: 0.2
    };

    Object.entries(intensities).forEach(([type, intensity]) => {
      this.normalMaps[type] = this.createNormalMap(intensity);
    });
  }

  createNormalMap(intensity) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(64, 64);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const x = (i / 4) % 64;
      const y = Math.floor((i / 4) / 64);
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * intensity;

      imageData.data[i] = 128 + noise * 127;     // R
      imageData.data[i + 1] = 128 + noise * 127; // G
      imageData.data[i + 2] = 255;               // B
      imageData.data[i + 3] = 255;               // A
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    return texture;
  }

  getTextures() {
    return this.textures;
  }

  getNormalMaps() {
    return this.normalMaps;
  }
}

class GoogleTileAPI {
  constructor(apiKey, session) {
    this.apiKey = apiKey;
    this.session = session;
  }
  getTileUrl(z, x, y) {
    if (!this.session) throw new Error('Session not initialized');
    return `https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${this.session}&key=${this.apiKey}`;
  }
}

export async function getMapTexture({
  bounds, zoom, size = 1024, profileLine, source = 'osm', apiKey = null, session = null, lineWidth = 3
}) {
  const tileSize = 256;
  function lonLatToTileXY(lon, lat, z) {
    const n = Math.pow(2, z);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
  }
  const topLeft = lonLatToTileXY(bounds.minLon, bounds.maxLat, zoom);
  const bottomRight = lonLatToTileXY(bounds.maxLon, bounds.minLat, zoom);
  const tilesX = bottomRight.x - topLeft.x + 1;
  const tilesY = bottomRight.y - topLeft.y + 1;

  const canvas = document.createElement('canvas');
  canvas.width = tilesX * tileSize;
  canvas.height = tilesY * tileSize;
  const ctx = canvas.getContext('2d');

  const promises = [];
  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      let url;
      if (source === 'google') {
        if (!apiKey || !session) throw new Error('Google Maps requires apiKey and session');
        const googleTile = new GoogleTileAPI(apiKey, session);
        url = googleTile.getTileUrl(zoom, topLeft.x + x, topLeft.y + y);
      } else {
        url = `https://tile.openstreetmap.org/${zoom}/${topLeft.x + x}/${topLeft.y + y}.png`;
      }
      promises.push(
        fetch(url)
          .then(r => r.ok ? r.blob() : null)
          .then(blob => blob ? createImageBitmap(blob) : null)
          .then(img => { if (img) ctx.drawImage(img, x * tileSize, y * tileSize); })
      );
    }
  }
  await Promise.all(promises);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

  if (profileLine && profileLine.length === 2) {
    const { minLon, maxLon, minLat, maxLat } = bounds;
    function lonLatToXY(lon, lat) {
      const x = ((lon - minLon) / (maxLon - minLon)) * size;
      const y = size - ((lat - minLat) / (maxLat - minLat)) * size;
      return { x, y };
    }
    const p1 = lonLatToXY(profileLine[0].lon, profileLine[0].lat);
    const p2 = lonLatToXY(profileLine[1].lon, profileLine[1].lat);
    outCtx.save();
    outCtx.strokeStyle = '#ef4444';
    outCtx.lineWidth = lineWidth;
    outCtx.beginPath();
    outCtx.moveTo(p1.x, p1.y);
    outCtx.lineTo(p2.x, p2.y);
    outCtx.stroke();
    outCtx.restore();
  }

  const texture = new THREE.CanvasTexture(outCanvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
} 