export class InfoPanel {
  constructor(id) {
    this.el = document.getElementById(id);
    this.terrainConfig = {
      waterLevel: 0,
      mountainLevel: 1000,
      snowLevel: 2500
    };
  }

  updateTerrainInfo(point, lon, lat, height) {
    this.el.innerHTML =
      `Długość geogr.: ${lon.toFixed(4)}<br>` +
      `Szerokość geogr.: ${lat.toFixed(4)}<br>` +
      `Wysokość: ${height.toFixed(1)} m`;
    // console.log(`lon: ${lon}, lat: ${lat}, height: ${height}`);
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

  updateProfileInfo(p1, p2) {
    this.el.innerHTML =
      `Profil: <br>` +
      `A (${p1.lon.toFixed(4)}, ${p1.lat.toFixed(4)})<br>` +
      `B (${p2.lon.toFixed(4)}, ${p2.lat.toFixed(4)})`;
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
    this.el.innerHTML = '';
  }

  showMessage(msg, type) {
    this.el.innerHTML = msg;
  }

  updateTerrainConfig(config) {
    this.terrainConfig = { ...this.terrainConfig, ...config };
  }
} 