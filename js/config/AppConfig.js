export const AppConfig = {
  terrain: {
    size: 100,              
    tileRes: 256,           
    demZoom: 7,             
    exaggeration: 3.0,      
  },

  profile: {
    samples: 200,          
  },

  elevation: {
    waterLevel: 0,          
    mountainLevel: 1000,    
    snowLevel: 2500,       
    slopeThreshold: 0.3    
  },

  camera: {
    fov: 45,                
    near: 0.1,              
    far: 1000,             
    initialPosition: { x: 0, y: 50, z: 100 }
  },

  renderer: {
    antialias: true,        
    shadowMapSize: 2048,   
    pixelRatio: window.devicePixelRatio
  },

  controls: {
    enableDamping: true,    
    dampingFactor: 0.05,    
    minDistance: 10,        
    maxDistance: 500,       
    minPolarAngle: 0,       
    maxPolarAngle: Math.PI * 0.7 
  },

  lighting: {
    directional: {
      color: 0xffffff,
      intensity: 1.0,
      position: { x: 30, y: 80, z: 40 }
    },
    ambient: {
      color: 0xffffff,
      intensity: 0.3
    }
  },

  ui: {
    profileChart: {
      width: 600,
      height: 160
    },
    infoPanel: {
      updateInterval: 100 
    }
  },

  textures: {
    repeat: { x: 20, y: 20 },
    normalMapSize: 64,
    proceduralTextureSize: 256
  },

  animation: {
    waterSpeed: 0.5,       
    frameRate: 60      
  }
};

export function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], AppConfig);
}

export function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const obj = keys.reduce((obj, key) => obj[key], AppConfig);
  obj[lastKey] = value;
}

export function getTerrainConfig() {
  return AppConfig.terrain;
}

export function getElevationConfig() {
  return AppConfig.elevation;
} 