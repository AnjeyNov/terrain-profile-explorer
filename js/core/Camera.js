import * as THREE from 'three';

export class Camera {
  constructor(container, fov = 45, near = 0.1, far = 1000) {
    this.container = container;
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.camera = this.createCamera();
  }

  createCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(this.fov, aspect, this.near, this.far);

    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  getCamera() {
    return this.camera;
  }

  updateAspect() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  lookAt(x, y, z) {
    this.camera.lookAt(x, y, z);
  }
} 