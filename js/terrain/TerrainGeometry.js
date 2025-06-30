import * as THREE from 'three';

export class TerrainGeometry {
  constructor(size, res) {
    this.size = size;
    this.res = res;
    this.geometry = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
    this.geometry.rotateX(-Math.PI / 2);
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
    return this.res;
  }

  static createMarkerPoint(radius = 1.5) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
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