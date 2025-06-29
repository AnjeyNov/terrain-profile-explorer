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
          r = 20 + Math.sin(x * 0.1) * Math.cos(y * 0.1) * 30;
          g = 60 + Math.sin(x * 0.15) * Math.cos(y * 0.12) * 40;
          b = 120 + Math.sin(x * 0.08) * Math.cos(y * 0.18) * 60;
          break;
        case 'sand':
          r = 220;
          g = 205;
          b = 135;
          break;
        case 'grass':
          r = 50 + Math.sin(x * 0.3) * Math.cos(y * 0.3) * 40;
          g = 120 + Math.sin(x * 0.35) * Math.cos(y * 0.25) * 60;
          b = 30 + Math.sin(x * 0.28) * Math.cos(y * 0.32) * 25;
          break;
        case 'rock':
          r = 100 + Math.sin(x * 0.4) * Math.cos(y * 0.4) * 50;
          g = 100 + Math.sin(x * 0.45) * Math.cos(y * 0.35) * 50;
          b = 100 + Math.sin(x * 0.38) * Math.cos(y * 0.42) * 50;
          break;
        case 'snow':
          r = 220 + Math.sin(x * 0.1) * Math.cos(y * 0.1) * 20;
          g = 220 + Math.sin(x * 0.12) * Math.cos(y * 0.08) * 20;
          b = 240 + Math.sin(x * 0.08) * Math.cos(y * 0.15) * 15;
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

export async function getOSMTexture(bounds, zoom, size = 1024) {

  const tileSize = 256;

  function lonLatToTileXY(lon, lat, z) {
    const n = Math.pow(2, z);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * n);
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
      const tileX = topLeft.x + x;
      const tileY = topLeft.y + y;
      const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
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
  outCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

  const texture = new THREE.CanvasTexture(outCanvas);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
} 