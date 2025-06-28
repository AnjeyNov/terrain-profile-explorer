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
    controls.maxPolarAngle = Math.PI * 0.7; // 70 градусов
    
    controls.minDistance = 10;
    controls.maxDistance = 500;
    
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    
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

  setPanEnabled(enabled) {
    this.controls.enablePan = enabled;
  }

  setZoomEnabled(enabled) {
    this.controls.enableZoom = enabled;
  }

  setRotateEnabled(enabled) {
    this.controls.enableRotate = enabled;
  }

  setDistanceLimits(min, max) {
    this.controls.minDistance = min;
    this.controls.maxDistance = max;
  }

  setPolarAngleLimits(min, max) {
    this.controls.minPolarAngle = min;
    this.controls.maxPolarAngle = max;
  }

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
    this.controls.update();
  }

  lookAt(x, y, z) {
    this.controls.target.set(x, y, z);
    this.controls.update();
  }

  reset() {
    this.controls.reset();
  }

  getCameraPosition() {
    return this.camera.position.clone();
  }

  getTarget() {
    return this.controls.target.clone();
  }

  setPanSpeed(speed) {
    this.controls.panSpeed = speed;
  }

  setZoomSpeed(speed) {
    this.controls.zoomSpeed = speed;
  }

  setRotateSpeed(speed) {
    this.controls.rotateSpeed = speed;
  }
} 