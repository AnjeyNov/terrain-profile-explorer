export class InfoPanel {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.terrainConfig = {
      waterLevel: 0,
      mountainLevel: 1000,
      snowLevel: 2500
    };
  }

  updateTerrainInfo(hitPoint, lon, lat, height) {
    if (!hitPoint) {
      this.clear();
      return;
    }

    const terrainType = this.getTerrainType(height);
    
    this.element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Информация о местности:</div>
      <div>Высота: ${Math.round(height)} м</div>
      <div>Тип: ${terrainType}</div>
      <div>Координаты: ${lon.toFixed(2)}°, ${lat.toFixed(2)}°</div>
      <div>X: ${hitPoint.x.toFixed(1)}, Y: ${hitPoint.y.toFixed(1)}, Z: ${hitPoint.z.toFixed(1)}</div>
    `;
  }

  getTerrainType(height) {
    if (height <= this.terrainConfig.waterLevel) {
      return 'Вода';
    } else if (height <= this.terrainConfig.waterLevel + 50) {
      return 'Песок';
    } else if (height >= this.terrainConfig.snowLevel) {
      return 'Снег';
    } else if (height >= this.terrainConfig.mountainLevel) {
      return 'Горы';
    } else {
      return 'Равнина';
    }
  }

  updateProfileInfo(point1, point2) {
    if (!point1 || !point2) return;

    const distance = this.calculateDistance(point1, point2);
    
    this.element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Профиль:</div>
      <div>Точка 1: ${point1.lon.toFixed(2)}°, ${point1.lat.toFixed(2)}°</div>
      <div>Точка 2: ${point2.lon.toFixed(2)}°, ${point2.lat.toFixed(2)}°</div>
      <div>Расстояние: ${distance.toFixed(1)} км</div>
    `;
  }

  calculateDistance(point1, point2) {
    const R = 6371; // Радиус Земли в км
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lon - point1.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  clear() {
    this.element.innerHTML = '';
  }

  showMessage(message, type = 'info') {
    const colors = {
      info: '#007bff',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };

    this.element.innerHTML = `
      <div style="color: ${colors[type]}; font-weight: bold;">
        ${message}
      </div>
    `;
  }

  updateTerrainConfig(config) {
    this.terrainConfig = { ...this.terrainConfig, ...config };
  }
} 