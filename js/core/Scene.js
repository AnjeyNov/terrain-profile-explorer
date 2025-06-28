import * as THREE from 'three';

export class Scene {
  constructor() {
    this.scene = new THREE.Scene();
    this.objects = new Map();
    this.init();
  }

  init() {
    this.scene.background = new THREE.Color(0x87CEEB); 
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
  }

  add(name, object) {
    this.scene.add(object);
    this.objects.set(name, object);
  }

  remove(name) {
    const object = this.objects.get(name);
    if (object) {
      this.scene.remove(object);
      this.objects.delete(name);
    }
  }

  get(name) {
    return this.objects.get(name);
  }

  getScene() {
    return this.scene;
  }

  clear() {
    this.objects.forEach((object, name) => {
      this.scene.remove(object);
    });
    this.objects.clear();
  }

  getAllObjects() {
    return Array.from(this.objects.values());
  }

  update() {

  }
} 