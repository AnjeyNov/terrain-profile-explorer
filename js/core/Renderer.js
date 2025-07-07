import * as THREE from 'three';

export class Renderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      antialias: true,
      alpha: false,
      ...options
    };
    this.renderer = this.createRenderer();
    this.setupRenderer();
  }

  createRenderer() {
    return new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha
    });
  }

  setupRenderer() {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);


    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;


    this.container.appendChild(this.renderer.domElement);
  }

  getRenderer() {
    return this.renderer;
  }

  getCanvas() {
    return this.renderer.domElement;
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }
} 