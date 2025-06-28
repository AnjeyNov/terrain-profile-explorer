import * as THREE from 'three';

export class TerrainGeometry {
  constructor(size = 100, resolution = 256) {
    this.size = size;
    this.resolution = resolution;
    this.geometry = this.createGeometry();
  }

  createGeometry() {
    const geometry = new THREE.PlaneGeometry(
      this.size, 
      this.size, 
      this.resolution - 1, 
      this.resolution - 1
    );
    
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }

  getGeometry() {
    return this.geometry;
  }

  updateAttributes(heights, slopes) {
    const pos = this.geometry.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heights[i]);
    }
    
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.setAttribute('height', new THREE.BufferAttribute(heights, 1));
    this.geometry.setAttribute('slope', new THREE.BufferAttribute(slopes, 1));
  }

  getSize() {
    return this.size;
  }

  getResolution() {
    return this.resolution;
  }

  static createMarkerPoint(size = 0.6) {
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    return new THREE.Mesh(geometry, material);
  }

  static createProfileLine(points, color = 0xff6600) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    
    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geometry, material);
  }
} 