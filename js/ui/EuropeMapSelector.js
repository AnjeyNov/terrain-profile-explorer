export class EuropeMapSelector {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.selectedRegion = null;
    
    this.europeBounds = {
      minLon: -25,
      maxLon: 45,
      minLat: 35,
      maxLat: 72
    };
    
    this.predefinedRegions = {
      'Альпы': { centerLon: 10, centerLat: 47, zoom: 8, name: 'Альпы' },
      'Пиренеи': { centerLon: 0, centerLat: 42, zoom: 6, name: 'Пиренеи' },
      'Карпаты': { centerLon: 25, centerLat: 47, zoom: 10, name: 'Карпаты' },
      'Скандинавия': { centerLon: 15, centerLat: 62, zoom: 15, name: 'Скандинавия' },
      'Балканы': { centerLon: 20, centerLat: 42, zoom: 12, name: 'Балканы' },
      'Британские острова': { centerLon: -5, centerLat: 55, zoom: 8, name: 'Британские острова' },
      'Центральная Европа': { centerLon: 10, centerLat: 50, zoom: 12, name: 'Центральная Европа' },
      'Восточная Европа': { centerLon: 30, centerLat: 50, zoom: 15, name: 'Восточная Европа' }
    };
    
    this.setupEventListeners();
    this.drawMap();
  }
  
  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }
  
  lonLatToPixel(lon, lat) {
    const x = ((lon - this.europeBounds.minLon) / (this.europeBounds.maxLon - this.europeBounds.minLon)) * this.canvas.width;
    const y = ((this.europeBounds.maxLat - lat) / (this.europeBounds.maxLat - this.europeBounds.minLat)) * this.canvas.height;
    return { x, y };
  }
  
  pixelToLonLat(x, y) {
    const lon = this.europeBounds.minLon + (x / this.canvas.width) * (this.europeBounds.maxLon - this.europeBounds.minLon);
    const lat = this.europeBounds.maxLat - (y / this.canvas.height) * (this.europeBounds.maxLat - this.europeBounds.minLat);
    return { lon, lat };
  }
  
  drawMap() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем контур Европы (упрощенный)
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = '#e5e7eb';
    
    // Основной континент
    this.ctx.beginPath();
    this.ctx.moveTo(50, 100); // Иберийский полуостров
    this.ctx.lineTo(150, 80);  // Франция
    this.ctx.lineTo(200, 60);  // Германия
    this.ctx.lineTo(250, 70);  // Польша
    this.ctx.lineTo(300, 90);  // Украина
    this.ctx.lineTo(320, 120); // Балканы
    this.ctx.lineTo(280, 150); // Греция
    this.ctx.lineTo(200, 180); // Италия
    this.ctx.lineTo(100, 200); // Испания
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    // Скандинавия
    this.ctx.beginPath();
    this.ctx.moveTo(180, 40);
    this.ctx.lineTo(200, 20);
    this.ctx.lineTo(220, 30);
    this.ctx.lineTo(240, 50);
    this.ctx.lineTo(220, 70);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    // Британские острова
    this.ctx.beginPath();
    this.ctx.arc(120, 60, 15, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Рисуем предустановленные регионы
    this.drawPredefinedRegions();
    
    // Рисуем текущую область выбора
    if (this.selectionStart && this.selectionEnd) {
      this.drawSelection();
    }
  }
  
  drawPredefinedRegions() {
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.textAlign = 'center';
    
    Object.entries(this.predefinedRegions).forEach(([key, region]) => {
      const pixel = this.lonLatToPixel(region.centerLon, region.centerLat);
      
      // Рисуем круг для региона
      this.ctx.beginPath();
      this.ctx.arc(pixel.x, pixel.y, 8, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.fill();
      this.ctx.strokeStyle = '#1e40af';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Подпись
      this.ctx.fillStyle = '#1e40af';
      this.ctx.fillText(region.name, pixel.x, pixel.y + 25);
    });
  }
  
  drawSelection() {
    if (!this.selectionStart || !this.selectionEnd) return;
    
    const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
    
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.setLineDash([]);
    
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    this.ctx.fillRect(x, y, width, height);
  }
  
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Проверяем, не кликнули ли мы на предустановленный регион
    const clickedRegion = this.getRegionAtPoint(x, y);
    if (clickedRegion) {
      this.selectedRegion = clickedRegion;
      this.drawMap();
      return;
    }
    
    this.isSelecting = true;
    this.selectionStart = { x, y };
    this.selectionEnd = { x, y };
    this.selectedRegion = null;
  }
  
  onMouseMove(e) {
    if (!this.isSelecting) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.selectionEnd = { x, y };
    this.drawMap();
  }
  
  onMouseUp(e) {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    
    if (this.selectionStart && this.selectionEnd) {
      const startCoords = this.pixelToLonLat(this.selectionStart.x, this.selectionStart.y);
      const endCoords = this.pixelToLonLat(this.selectionEnd.x, this.selectionEnd.y);
      
      this.selectedRegion = {
        centerLon: (startCoords.lon + endCoords.lon) / 2,
        centerLat: (startCoords.lat + endCoords.lat) / 2,
        zoom: Math.abs(endCoords.lon - startCoords.lon) * 0.8,
        name: 'Выбранная область'
      };
    }
  }
  
  getRegionAtPoint(x, y) {
    for (const [key, region] of Object.entries(this.predefinedRegions)) {
      const pixel = this.lonLatToPixel(region.centerLon, region.centerLat);
      const distance = Math.sqrt((x - pixel.x) ** 2 + (y - pixel.y) ** 2);
      
      if (distance <= 12) {
        return region;
      }
    }
    return null;
  }
  
  getSelectedRegion() {
    return this.selectedRegion;
  }
  
  show() {
    document.getElementById('region-selector-modal').style.display = 'flex';
  }
  
  hide() {
    document.getElementById('region-selector-modal').style.display = 'none';
  }
} 