import * as THREE from 'three';

import { AppConfig, getConfig } from './config/AppConfig.js';

import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { Controls } from './core/Controls.js';

import { TerrainGeometry } from './terrain/TerrainGeometry.js';
import { TerrainMaterial } from './terrain/TerrainMaterial.js';
import { TerrainTextures, getGoogleSatelliteTexture, getOSMTexture } from './terrain/TerrainTextures.js';
import { DEMLoader } from './terrain/DEMLoader.js';

import { ProfileChart } from './ui/ProfileChart.js';
import { InfoPanel } from './ui/InfoPanel.js';
import { EuropeMapSelector } from './ui/EuropeMapSelector.js';

import { Coordinates } from './utils/Coordinates.js';
import { MathUtils } from './utils/MathUtils.js';

class TerrainExplorer {
  constructor() {
    this.clickPoints = [];
    this.time = 0;

    this.centerLon = 10;
    this.centerLat = 54;
    this.zoom = 40;
    this.osmTexture = null;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.europeMapSelector = null;
    this.mapType = 'osm';

    this.init();
  }

  async init() {
    this.setupCore();
    this.setupTerrain();
    this.setupUI();
    this.setupLighting();
    this.setupEventListeners();
    this.setupRegionSelector();
    this.setupMapTypeSwitcher();
    await this.showRegionSelector();
  }

  setupCore() {
    const container = document.querySelector('#container');

    this.scene = new Scene();
    this.camera = new Camera(container, getConfig('camera.fov'), getConfig('camera.near'), getConfig('camera.far'));
    this.renderer = new Renderer(container, getConfig('renderer'));
    this.controls = new Controls(this.camera.getCamera(), this.renderer.getRenderer());
    this.controls.setPanEnabled(false);
  }

  setupTerrain() {
    this.terrainTextures = new TerrainTextures();
    const textures = this.terrainTextures.getTextures();
    const normalMaps = this.terrainTextures.getNormalMaps();

    this.terrainGeometry = new TerrainGeometry(
      getConfig('terrain.size'),
      getConfig('terrain.tileRes')
    );

    this.terrainMaterial = new TerrainMaterial(textures, normalMaps, AppConfig.elevation, null);

    this.terrainMesh = new THREE.Mesh(
      this.terrainGeometry.getGeometry(),
      this.terrainMaterial.getMaterial()
    );
    this.terrainMesh.rotation.y = Math.PI;
    this.scene.add('terrain', this.terrainMesh);
    this.demLoader = new DEMLoader();
  }

  setupUI() {
    const chartConfig = getConfig('ui.profileChart');
    this.profileChart = new ProfileChart('profile-chart', chartConfig.width, chartConfig.height);
    this.infoPanel = new InfoPanel('tilt-indicator');
  }

  setupLighting() {
    const lightingConfig = getConfig('lighting');

    const directionalLight = new THREE.DirectionalLight(
      lightingConfig.directional.color,
      lightingConfig.directional.intensity
    );
    directionalLight.position.set(
      lightingConfig.directional.position.x,
      lightingConfig.directional.position.y,
      lightingConfig.directional.position.z
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = getConfig('renderer.shadowMapSize');
    directionalLight.shadow.mapSize.height = getConfig('renderer.shadowMapSize');
    this.scene.add('directionalLight', directionalLight);

    const ambientLight = new THREE.AmbientLight(
      lightingConfig.ambient.color,
      lightingConfig.ambient.intensity
    );
    this.scene.add('ambientLight', ambientLight);
  }

  setupEventListeners() {
    const canvas = this.renderer.getCanvas();
    canvas.addEventListener('mousemove', (ev) => this.onMouseMove(ev));
    canvas.addEventListener('wheel', (ev) => this.onWheel(ev));
    // canvas.addEventListener('click', (ev) => this.onClick(ev));
    window.addEventListener('resize', () => this.onResize());

    // Добавляем обработчик двойного клика для выбора точек профиля
    canvas.addEventListener('dblclick', async (ev) => {
      await this.onClick(ev);
    });
  }

  setupRegionSelector() {
    this.europeMapSelector = new EuropeMapSelector('europe-map-canvas');

    document.getElementById('select-region-btn').addEventListener('click', () => {
      this.showRegionSelector();
    });

    document.getElementById('cancel-region').addEventListener('click', () => {
      this.europeMapSelector.hide();
    });

    document.getElementById('confirm-region').addEventListener('click', () => {
      this.loadSelectedRegion();
    });
  }

  setupMapTypeSwitcher() {
    const switcher = document.getElementById('map-type-switcher');
    if (!switcher) return;
    switcher.querySelectorAll('input[name="mapType"]').forEach(el => {
      el.addEventListener('change', (e) => {
        this.mapType = e.target.value;
        this.loadSelectedRegion();
      });
    });
  }

  async showRegionSelector() {
    this.europeMapSelector.show();
  }

  async loadSelectedRegion() {
    const selectedRegion = this.europeMapSelector.getSelectedRegion();
    if (!selectedRegion) {
      alert('Proszę wybrać obszar na mapie');
      return;
    }

    this.centerLon = selectedRegion.centerLon;
    this.centerLat = selectedRegion.centerLat;
    this.zoom = selectedRegion.zoom;

    this.europeMapSelector.hide();
    const bounds = {
      minLon: this.centerLon - this.zoom / 2,
      maxLon: this.centerLon + this.zoom / 2,
      minLat: this.centerLat - this.zoom / 2 * (37 / 55),
      maxLat: this.centerLat + this.zoom / 2 * (37 / 55)
    };
    const texZoom = 8;
    let texture = null;
    if (this.mapType === 'osm') {
      this.infoPanel.showMessage('Ładowanie mapy OSM...', 'info');
      texture = await getOSMTexture(bounds, texZoom, 1024);
    } else if (this.mapType === 'satellite') {
      this.infoPanel.showMessage('Ładowanie mapy satelitarnej Google...', 'info');
      const apiKey = document.getElementById('google-api-key').value.trim();
      if (!apiKey) {
        this.infoPanel.showMessage('Wprowadź klucz Google API!', 'error');
        return;
      }
      let session = null;
      try {
        const resp = await fetch(`https://tile.googleapis.com/v1/createSession?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mapType: 'satellite',
              language: 'en-US',
              region: 'US'
            })
          }
        );
        const data = await resp.json();
        session = data.session;
      } catch (e) {
        this.infoPanel.showMessage('Błąd uzyskania sesji Google Tiles', 'error');
        return;
      }
      texture = await getGoogleSatelliteTexture(bounds, texZoom, 1024, apiKey, session);
    } else if (this.mapType === 'dem') {
      this.infoPanel.showMessage('Ładowanie DEM tiles...', 'info');
      texture = await this.generateDEMTileTexture(bounds, texZoom, 1024);
    } else if (this.mapType === 'dem_decoded') {
      this.infoPanel.showMessage('Ładowanie decoded DEM...', 'info');
      texture = await this.generateDecodedDEMTexture(bounds, texZoom, 1024);
    }
    this.osmTexture = texture;
    this.terrainMaterial.setOSMMap(this.osmTexture);
    this.infoPanel.clear();
    await this.updateTerrain();
    this.animate();
  }

  async updateTerrain() {
    this.centerLon = Math.max(-25, Math.min(45, this.centerLon));
    this.centerLat = Math.max(35, Math.min(72, this.centerLat));
    this.zoom = Math.max(2, Math.min(70, this.zoom));
    // Получаем bounds и параметры
    const bounds = {
      minLon: this.centerLon - this.zoom / 2,
      maxLon: this.centerLon + this.zoom / 2,
      minLat: this.centerLat - this.zoom / 2 * (37 / 55),
      maxLat: this.centerLat + this.zoom / 2 * (37 / 55)
    };
    const texZoom = 8;
    const size = 1024;
    // Генерируем DEM-текстуру и canvas
    const { demCanvas } = await this.generateDEMTileTexture(bounds, texZoom, size);
    // Применяем рельеф по DEM-канвасу
    await this.demLoader.applyDEMTileTextureToGeometry(
      this.terrainGeometry.getGeometry(),
      demCanvas,
      getConfig('terrain.exaggeration'),
      { flipY: true, flipX: true, testChannel: null }
    );
  }

  async onMouseMove(ev) {
    const hit = this.getHitPoint(ev);
    if (hit) {
      const { x: mx, z: mz } = hit.point;
      const bounds = {
        minLon: this.centerLon - this.zoom / 2,
        maxLon: this.centerLon + this.zoom / 2,
        minLat: this.centerLat - this.zoom / 2 * (37 / 55),
        maxLat: this.centerLat + this.zoom / 2 * (37 / 55)
      };
      const size = getConfig('terrain.size');
      const u = 1.0 - (mx / size + 0.5);
      const v = 1.0 - (mz / size + 0.5);
      const lon = bounds.minLon + u * (bounds.maxLon - bounds.minLon);
      const lat = bounds.minLat + v * (bounds.maxLat - bounds.minLat);
      // Новый способ: высота из DEM
      const height = await this.demLoader.heightAtLonLat(lon, lat);
      this.infoPanel.updateTerrainInfo(hit.point, lon, lat, height);
    } else {
      this.infoPanel.clear();
    }
  }

  onWheel(ev) {
    ev.preventDefault();
  }

  async onClick(ev) {
    const hit = this.getHitPoint(ev);
    if (!hit) return;

    const { x: mx, z: mz } = hit.point;
    const relX = mx / getConfig('terrain.size');
    const relZ = mz / getConfig('terrain.size');
    const lon = this.centerLon + relX * this.zoom;
    const lat = this.centerLat + relZ * this.zoom * (37 / 55);

    if (this.clickPoints.length === 2) {
      this.scene.remove('marker_1');
      this.scene.remove('marker_2');
      this.scene.remove('profile_line');
      this.clickPoints = [];
    }

    this.clickPoints.push({ mx, mz, lon, lat, y: hit.point.y });

    const marker = TerrainGeometry.createMarkerPoint(0.8);
    marker.position.copy(hit.point);
    this.scene.add(`marker_${this.clickPoints.length}`, marker);

    if (this.clickPoints.length === 2) {
      await this.updateTerrain();
      await this.createProfile();
    }
  }

  getHitPoint(ev) {
    const canvas = this.renderer.getCanvas();
    const mouse = new THREE.Vector2();

    mouse.x = (ev.clientX / canvas.clientWidth) * 2 - 1;
    mouse.y = -(ev.clientY / canvas.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera.getCamera());

    return raycaster.intersectObject(this.terrainMesh)[0];
  }

  async createProfile() {
    try {
      // Новый способ: профиль по mesh (geometry)
      const geom = this.terrainGeometry.getGeometry();
      const pos = geom.attributes.position;
      const samples = getConfig('profile.samples');
      const profile = [];
      const mx0 = this.clickPoints[0].mx;
      const mx1 = this.clickPoints[1].mx;
      const mz0 = this.clickPoints[0].mz;
      const mz1 = this.clickPoints[1].mz;
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        // Отражаем обе координаты, чтобы профиль совпадал с рельефом после flipX/flipY
        const mx = -MathUtils.lerp(mx0, mx1, t);
        const mz = -MathUtils.lerp(mz0, mz1, t);
        // Найти ближайшую вершину
        let minDist = Infinity, minIdx = 0;
        for (let j = 0; j < pos.count; j++) {
          const dx = pos.getX(j) - mx;
          const dz = pos.getZ(j) - mz;
          const dist = dx * dx + dz * dz;
          if (dist < minDist) { minDist = dist; minIdx = j; }
        }
        profile.push(pos.getY(minIdx) * 1000); // mesh в километрах, домножаем на 1000
      }

      // Выводим координаты и высоты профиля в консоль
      console.log('Profile points (mesh heights):');
      profile.forEach((h, i) => {
        const t = i / (profile.length - 1);
        const mx = MathUtils.lerp(this.clickPoints[0].mx, this.clickPoints[1].mx, t);
        const mz = MathUtils.lerp(this.clickPoints[0].mz, this.clickPoints[1].mz, t);
        console.log(`mx: ${mx}, mz: ${mz}, height: ${h}`);
      });

      this.profileChart.drawProfile(profile);
      this.infoPanel.updateProfileInfo(this.clickPoints[0], this.clickPoints[1]);
    } catch (error) {
      console.error('Error creating profile:', error);
      this.infoPanel.showMessage('Ошибка при создании профиля', 'error');
    }
  }

  onResize() {
    this.camera.updateAspect();
    this.renderer.resize();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.time += 1 / getConfig('animation.frameRate');
    this.terrainMaterial.updateTime(this.time * getConfig('animation.waterSpeed'));
    this.controls.update();
    this.renderer.render(this.scene.getScene(), this.camera.getCamera());
  }

  getStats() {
    return {
      cacheStats: this.demLoader.getCacheStats(),
      sceneObjects: this.scene.getAllObjects().length,
      clickPoints: this.clickPoints.length,
      config: AppConfig
    };
  }

  // Генерация DEM tiles как текстуры (визуализация Terrarium RGB)
  async generateDEMTileTexture(bounds, zoom, size = 1024) {
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
        const tileX = topLeft.x + x;
        const tileY = topLeft.y + y;
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${tileX}/${tileY}.png`;
        promises.push(
          fetch(url)
            .then(r => r.ok ? r.blob() : null)
            .then(blob => blob ? createImageBitmap(blob) : null)
            .then(img => { if (img) ctx.drawImage(img, x * tileSize, y * tileSize); })
        );
      }
    }
    await Promise.all(promises);

    // Масштабируем под нужный размер
    const outCanvas = document.createElement('canvas');
    outCanvas.width = size;
    outCanvas.height = size;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

    const texture = new THREE.CanvasTexture(outCanvas);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return { texture, demCanvas: outCanvas };
  }

  // Генерация decoded DEM tiles как цветной карты высот
  async generateDecodedDEMTexture(bounds, zoom, size = 1024) {
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

    // Сначала загружаем все DEM-тайлы
    const demTiles = [];
    for (let x = 0; x < tilesX; x++) {
      demTiles[x] = [];
      for (let y = 0; y < tilesY; y++) {
        const tileX = topLeft.x + x;
        const tileY = topLeft.y + y;
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${tileX}/${tileY}.png`;
        const img = await fetch(url)
          .then(r => r.ok ? r.blob() : null)
          .then(blob => blob ? createImageBitmap(blob) : null);
        demTiles[x][y] = img;
      }
    }

    // Создаём canvas для всей области
    const canvas = document.createElement('canvas');
    canvas.width = tilesX * tileSize;
    canvas.height = tilesY * tileSize;
    const ctx = canvas.getContext('2d');

    // Рисуем DEM-тайлы на canvas
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        if (demTiles[x][y]) ctx.drawImage(demTiles[x][y], x * tileSize, y * tileSize);
      }
    }

    // Получаем данные пикселей
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    // Перекрашиваем каждый пиксель в зависимости от высоты
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Формула Terrarium
      const h = (r * 256 + g + b / 256) - 32768;
      let color = [0, 0, 0];
      if (h <= 0) {
        // Глубина — синий
        color = [30, 80, 200];
      } else if (h <= 50) {
        // Низина — зелёный
        color = [60, 180, 75];
      } else if (h <= 1000) {
        // Равнина — светло-зелёный
        color = [170, 220, 120];
      } else if (h <= 2500) {
        // Горы — коричневый
        color = [180, 120, 60];
      } else {
        // Снег — белый
        color = [255, 255, 255];
      }
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
    }
    ctx.putImageData(imgData, 0, 0);

    // Масштабируем под нужный размер
    const outCanvas = document.createElement('canvas');
    outCanvas.width = size;
    outCanvas.height = size;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);

    const texture = new THREE.CanvasTexture(outCanvas);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TerrainExplorer();
}); 