import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Controls {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.controls = this.createControls();
  }

  createControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 3;

    controls.minDistance = 10;
    controls.maxDistance = 500;

    controls.enablePan = false;

    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;

    controls.enableRotate = true;
    controls.rotateSpeed = 1.0;

    return controls;
  }

  getControls() {
    return this.controls;
  }

  update() {
    this.controls.update();
  }
} 