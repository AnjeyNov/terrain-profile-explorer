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
    canvas.addEventListener('click', (ev) => this.onClick(ev));
    window.addEventListener('resize', () => this.onResize());
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
      minLat: this.centerLat - this.zoom / 2 * (37/55),
      maxLat: this.centerLat + this.zoom / 2 * (37/55)
    };
    const texZoom = 8;
    let texture = null;
    if (this.mapType === 'osm') {
      this.infoPanel.showMessage('Ładowanie mapy OSM...', 'info');
      texture = await getOSMTexture(bounds, texZoom, 1024);
    } else {
      this.infoPanel.showMessage('Ładowanie mapy satelitarnej Google...', 'info');
      const apiKey = 'AIzaSyCu5UeYxXJxT2RrP9j-QlrMyuOphvMgQ5Q'; // TODO: wyciągnąć do konfiguracji
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
    await this.demLoader.applyDEMToGeometry(
      this.terrainGeometry.getGeometry(),
      this.centerLon,
      this.centerLat,
      this.zoom,
      getConfig('terrain.size'),
      getConfig('terrain.exaggeration')
    );
  }

  onMouseMove(ev) {
    const hit = this.getHitPoint(ev);
    if (hit) {
      const { x: mx, z: mz, y: my } = hit.point;
      const bounds = {
        minLon: this.centerLon - this.zoom / 2,
        maxLon: this.centerLon + this.zoom / 2,
        minLat: this.centerLat - this.zoom / 2 * (37/55),
        maxLat: this.centerLat + this.zoom / 2 * (37/55)
      };
      const size = getConfig('terrain.size');
      const u = 1.0 - (mx / size + 0.5);
      const v = 1.0 - (mz / size + 0.5);
      const lon = bounds.minLon + u * (bounds.maxLon - bounds.minLon);
      const lat = bounds.minLat + v * (bounds.maxLat - bounds.minLat);
      const height = my * 1000;
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
    const lat = this.centerLat + relZ * this.zoom * (37/55);

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
      const getY = (mx, mz) => {
        const geom = this.terrainGeometry.getGeometry();
        const pos = geom.attributes.position;
        let minDist = Infinity, minIdx = 0;
        for (let i = 0; i < pos.count; i++) {
          const dx = pos.getX(i) - mx;
          const dz = pos.getZ(i) - mz;
          const dist = dx*dx + dz*dz;
          if (dist < minDist) { minDist = dist; minIdx = i; }
        }
        return pos.getY(minIdx);
      };
      const p1 = this.clickPoints[0];
      const p2 = this.clickPoints[1];
      const y1 = getY(p1.mx, p1.mz);
      const y2 = getY(p2.mx, p2.mz);
      const v1 = new THREE.Vector3(p1.mx, y1, p1.mz);
      const v2 = new THREE.Vector3(p2.mx, y2, p2.mz);
      const geometry = new THREE.BufferGeometry().setFromPoints([v1, v2]);
      const material = new THREE.LineBasicMaterial({ color: 0xff2222, linewidth: 12 });
      material.depthTest = false;
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 999;
      this.scene.add('profile_line', line);
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
      const profile = await this.demLoader.createHeightProfile(
        this.clickPoints[0],
        this.clickPoints[1],
        getConfig('profile.samples')
      );
      
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
}

document.addEventListener('DOMContentLoaded', () => {
  new TerrainExplorer();
}); 