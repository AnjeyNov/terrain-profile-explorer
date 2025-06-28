import * as THREE from 'three';

import { AppConfig, getConfig } from './config/AppConfig.js';

import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { Controls } from './core/Controls.js';

import { TerrainGeometry } from './terrain/TerrainGeometry.js';
import { TerrainMaterial } from './terrain/TerrainMaterial.js';
import { TerrainTextures } from './terrain/TerrainTextures.js';
import { DEMLoader } from './terrain/DEMLoader.js';

import { ProfileChart } from './ui/ProfileChart.js';
import { InfoPanel } from './ui/InfoPanel.js';

import { Coordinates } from './utils/Coordinates.js';
import { MathUtils } from './utils/MathUtils.js';

class TerrainExplorer {
  constructor() {
    this.clickPoints = [];
    this.time = 0;
    
    this.init();
  }

  async init() {
    this.setupCore();
    this.setupTerrain();
    this.setupUI();
    this.setupLighting();
    this.setupEventListeners();

    await this.loadInitialTerrain();

    this.animate();
  }

  setupCore() {
    const container = document.querySelector('#container');
    
    this.scene = new Scene();
    this.camera = new Camera(container, getConfig('camera.fov'), getConfig('camera.near'), getConfig('camera.far'));
    this.renderer = new Renderer(container, getConfig('renderer'));
    this.controls = new Controls(this.camera.getCamera(), this.renderer.getRenderer());
  }

  setupTerrain() {
    this.terrainTextures = new TerrainTextures();
    const textures = this.terrainTextures.getTextures();
    const normalMaps = this.terrainTextures.getNormalMaps();

    this.terrainGeometry = new TerrainGeometry(
      getConfig('terrain.size'), 
      getConfig('terrain.tileRes')
    );

    this.terrainMaterial = new TerrainMaterial(textures, normalMaps, AppConfig.elevation);
    
    this.terrainMesh = new THREE.Mesh(
      this.terrainGeometry.getGeometry(),
      this.terrainMaterial.getMaterial()
    );

    this.scene.add('terrain', this.terrainMesh);
    this.demLoader = new DEMLoader();
  }

  setupUI() {
    const chartConfig = getConfig('ui.profileChart');
    this.profileChart = new ProfileChart('profile', chartConfig.width, chartConfig.height);
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
    
    canvas.addEventListener('click', (ev) => this.onClick(ev));
    
    window.addEventListener('resize', () => this.onResize());
  }

  async loadInitialTerrain() {
    try {
      await this.demLoader.applyDEMToGeometry(
        this.terrainGeometry.getGeometry(),
        0, 0,
        getConfig('terrain.size'),
        getConfig('terrain.exaggeration')
      );
    } catch (error) {
      console.error('Error loading initial terrain:', error);
    }
  }

  onMouseMove(ev) {
    const hit = this.getHitPoint(ev);
    
    if (hit) {
      const { x: mx, z: mz, y: my } = hit.point;
      const { lon, lat } = Coordinates.modelToLonLat(mx, mz, getConfig('terrain.size'));
      const height = my * 1000; 
      
      this.infoPanel.updateTerrainInfo(hit.point, lon, lat, height);
    } else {
      this.infoPanel.clear();
    }
  }

  async onClick(ev) {
    const hit = this.getHitPoint(ev);
    if (!hit) return;

    const { x: mx, z: mz } = hit.point;
    const { lon, lat } = Coordinates.modelToLonLat(mx, mz, getConfig('terrain.size'));
    
    this.clickPoints.push({ mx, mz, lon, lat });

    const marker = TerrainGeometry.createMarkerPoint();
    marker.position.copy(hit.point);
    this.scene.add(`marker_${this.clickPoints.length}`, marker);

    if (this.clickPoints.length === 2) {
      await this.createProfile();
      this.clickPoints = [];
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
      
      this.scene.remove('marker_1');
      this.scene.remove('marker_2');
      
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