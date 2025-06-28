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
          r = 200 + Math.sin(x * 0.2) * Math.cos(y * 0.2) * 30;
          g = 180 + Math.sin(x * 0.25) * Math.cos(y * 0.15) * 25;
          b = 120 + Math.sin(x * 0.18) * Math.cos(y * 0.22) * 20;
          break;
        case 'grass':
          // Зеленый цвет для травы
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