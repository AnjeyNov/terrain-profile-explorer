import * as THREE from 'three';

export class TerrainMaterial {
  constructor(textures, normalMaps, terrainConfig) {
    this.textures = textures;
    this.normalMaps = normalMaps;
    this.config = terrainConfig;
    this.material = this.createShaderMaterial();
  }

  createShaderMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        waterTexture: { value: this.textures.water },
        sandTexture: { value: this.textures.sand },
        grassTexture: { value: this.textures.grass },
        rockTexture: { value: this.textures.rock },
        snowTexture: { value: this.textures.snow },
        waterNormalMap: { value: this.normalMaps.water },
        sandNormalMap: { value: this.normalMaps.sand },
        grassNormalMap: { value: this.normalMaps.grass },
        rockNormalMap: { value: this.normalMaps.rock },
        snowNormalMap: { value: this.normalMaps.snow },
        waterLevel: { value: this.config.waterLevel / 1000 },
        mountainLevel: { value: this.config.mountainLevel / 1000 },
        snowLevel: { value: this.config.snowLevel / 1000 },
        slopeThreshold: { value: this.config.slopeThreshold },
        lightDirection: { value: new THREE.Vector3(0.5, 1, 0.5).normalize() },
        time: { value: 0.0 }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader()
    });
  }

  getVertexShader() {
    return `
      attribute float height;
      attribute float slope;
      varying float vHeight;
      varying float vSlope;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vHeight = height;
        vSlope = slope;
        vNormal = normal;
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  getFragmentShader() {
    return `
      uniform sampler2D waterTexture, sandTexture, grassTexture, rockTexture, snowTexture;
      uniform sampler2D waterNormalMap, sandNormalMap, grassNormalMap, rockNormalMap, snowNormalMap;
      uniform float waterLevel, mountainLevel, snowLevel, slopeThreshold;
      uniform vec3 lightDirection;
      uniform float time;
      
      varying float vHeight;
      varying float vSlope;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vec4 color;
        vec3 normal;
        float reflection = 0.0;
        
        // Выбираем текстуру на основе высоты и крутизны
        if (vHeight <= waterLevel) {
          // Вода с отражениями
          color = texture2D(waterTexture, vUv + vec2(sin(time * 0.5) * 0.01, cos(time * 0.3) * 0.01));
          normal = texture2D(waterNormalMap, vUv + vec2(sin(time * 0.2) * 0.02, cos(time * 0.4) * 0.02)).rgb * 2.0 - 1.0;
          reflection = 0.8;
        } else if (vHeight <= waterLevel + 50.0) {
          // Песок
          color = texture2D(sandTexture, vUv);
          normal = texture2D(sandNormalMap, vUv).rgb * 2.0 - 1.0;
          reflection = 0.1;
        } else if (vSlope > slopeThreshold) {
          // Скалы
          color = texture2D(rockTexture, vUv);
          normal = texture2D(rockNormalMap, vUv).rgb * 2.0 - 1.0;
          reflection = 0.05;
        } else if (vHeight >= snowLevel) {
          // Снег
          color = texture2D(snowTexture, vUv);
          normal = texture2D(snowNormalMap, vUv).rgb * 2.0 - 1.0;
          reflection = 0.3;
        } else {
          // Трава
          color = texture2D(grassTexture, vUv);
          normal = texture2D(grassNormalMap, vUv).rgb * 2.0 - 1.0;
          reflection = 0.0;
        }
        
        // Улучшенное освещение
        vec3 lightDir = normalize(lightDirection);
        vec3 viewDir = normalize(-vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        
        // Диффузное освещение
        float diffuse = max(dot(normalize(vNormal + normal), lightDir), 0.0);
        
        // Спекулярное освещение
        float specular = pow(max(dot(normalize(vNormal + normal), halfDir), 0.0), 32.0);
        
        // Фоновое освещение
        float ambient = 0.3;
        
        // Применяем освещение
        color.rgb *= (ambient + diffuse * 0.7 + specular * reflection);
        
        // Добавляем атмосферную перспективу для воды
        if (vHeight <= waterLevel) {
          float depth = abs(vHeight - waterLevel) * 10.0;
          color.rgb = mix(color.rgb, vec3(0.1, 0.2, 0.4), min(depth, 0.8));
        }
        
        gl_FragColor = color;
      }
    `;
  }

  updateTime(time) {
    this.material.uniforms.time.value = time;
  }
  getMaterial() {
    return this.material;
  }
} 