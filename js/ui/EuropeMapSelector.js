export class EuropeMapSelector {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.zoom   = 4;

    // Границы «окна» по долготе/широте (без Гренландии и Африки)
    this.europeBounds = {
      minLon: -25, maxLon: 45,
      minLat:  36, maxLat: 60
    };

    // В конструкторе замените границы на такие:
this.europeBounds = {
  minLon: -25,
  maxLon:  45,
  minLat:  36,   // по-прежнему юг Испании
  maxLat:  65    // теперь до 70° N — Швеция в кадре
};


    // Будем запоминать самый «левый/верхний» тайл, чтобы сдвигать всё влево/вверх
    this.originTileX = 0;
    this.originTileY = 0;

    this.tileCache = new Map();
    this.predefinedRegions = {
      'Альпы':              { centerLon: 10,  centerLat: 47, zoom:  8,  name: 'Альпы' },
      'Пиренеи':            { centerLon:  0,  centerLat: 42, zoom:  6,  name: 'Пиренеи' },
      'Карпаты':            { centerLon: 25,  centerLat: 47, zoom: 10,  name: 'Карпаты' },
      'Скандинавия':        { centerLon: 15,  centerLat: 62, zoom: 15,  name: 'Скандинавия' },
      'Балканы':            { centerLon: 20,  centerLat: 42, zoom: 12,  name: 'Балканы' },
      'Британские острова': { centerLon:-5,   centerLat: 55, zoom:  8,  name: 'Британские острова' },
      'Центральная Европа': { centerLon:10,   centerLat: 50, zoom: 12,  name: 'Центральная Европа' },
      'Восточная Европа':   { centerLon:30,   centerLat: 50, zoom: 15,  name: 'Восточная Европа' }
    };

    this.selectionStart  = null;
    this.selectionEnd    = null;
    this.isSelecting     = false;
    this.selectedRegion  = null;

    this.setupEventListeners();
    this.loadMapTiles();
  }

  // Преобразование lon/lat → глобальные пиксели Web-Mercator при данном this.zoom
  lonLatToGlobalPixel(lon, lat) {
    const z2 = Math.pow(2, this.zoom);
    const tileSize = 256;

    const x = ((lon + 180) / 360) * tileSize * z2;

    const sinLat = Math.sin(lat * Math.PI / 180);
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))
            * tileSize * z2;

    return { x, y };
  }

  // lon/lat → координаты на canvas (с учётом originTileX/Y)
  lonLatToPixel(lon, lat) {
    const gp = this.lonLatToGlobalPixel(lon, lat);
    return {
      x: gp.x - this.originTileX * 256,
      y: gp.y - this.originTileY * 256
    };
  }

  // Разворот pixel → lon/lat нужен только для выбора области
  pixelToLonLat(px, py) {
    // вычислим глобальный пиксель
    const gx = px + this.originTileX * 256;
    const gy = py + this.originTileY * 256;

    const z2 = Math.pow(2, this.zoom);
    const tileSize = 256;
    const lon = gx / (tileSize * z2) * 360 - 180;

    // обратная формула Меркатора:
    const n = Math.PI - 2 * Math.PI * gy / (tileSize * z2);
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    return { lon, lat };
  }

  // Преобразование lon/lat → целочисленные координаты тайла OSM
  lonLatToTileXY(lon, lat) {
    const n = Math.pow(2, this.zoom);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor(
      (1 - Math.log(Math.tan(lat * Math.PI/180)
      + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * n
    );
    return { x: xtile, y: ytile };
  }

  async loadMapTiles() {
    const tileSize = 256;
    const tilesX = Math.ceil(this.canvas.width  / tileSize);
    const tilesY = Math.ceil(this.canvas.height / tileSize);

    let minTileX = Infinity, minTileY = Infinity;
    const promises = [];

    for (let ix = 0; ix < tilesX; ix++) {
      for (let iy = 0; iy < tilesY; iy++) {
        // точка внутри «окна»:
        const lon = this.europeBounds.minLon
                  + (ix + 0.5) * (this.europeBounds.maxLon - this.europeBounds.minLon) / tilesX;
        const lat = this.europeBounds.maxLat
                  - (iy + 0.5) * (this.europeBounds.maxLat - this.europeBounds.minLat) / tilesY;

        const { x: tileX, y: tileY } = this.lonLatToTileXY(lon, lat);
        minTileX = Math.min(minTileX, tileX);
        minTileY = Math.min(minTileY, tileY);

        const key = `${this.zoom}/${tileX}/${tileY}`;
        if (!this.tileCache.has(key)) {
          promises.push(
            fetch(`https://tile.openstreetmap.org/${this.zoom}/${tileX}/${tileY}.png`)
            .then(r => {
              if (!r.ok) throw new Error(`Tile ${tileX}/${tileY} failed`);
              return r.blob();
            })
            .then(blob => createImageBitmap(blob))
            .then(img => {
              this.tileCache.set(key, { img, tileX, tileY });
            })
          );
        }
      }
    }

    await Promise.all(promises);
    this.originTileX = minTileX;
    this.originTileY = minTileY;
    this.drawMap();
  }

  drawMap() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTiles();
    this.drawPredefinedRegions();
    if (this.selectionStart && this.selectionEnd) this.drawSelection();
  }

  drawTiles() {
    this.tileCache.forEach(({ img, tileX, tileY }) => {
      const x = (tileX - this.originTileX) * 256;
      const y = (tileY - this.originTileY) * 256;
      this.ctx.drawImage(img, x, y);
    });
  }

  drawPredefinedRegions() {
    this.ctx.font      = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    Object.values(this.predefinedRegions).forEach(r => {
      const p = this.lonLatToPixel(r.centerLon, r.centerLat);

      // красный кружок
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 12, 0, 2*Math.PI);
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // подпись
      this.ctx.fillStyle   = '#ef4444';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth   = 3;
      this.ctx.strokeText(r.name, p.x, p.y + 30);
      this.ctx.fillText  (r.name, p.x, p.y + 30);
    });
  }

  drawSelection() {
    const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const w = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const h = Math.abs(this.selectionEnd.y - this.selectionStart.y);

    this.ctx.setLineDash([8,8]);
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth   = 3;
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = 'rgba(16,185,129,0.2)';
    this.ctx.fillRect(x, y, w, h);
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup',   e => this.onMouseUp(e));
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const region = this.getRegionAtPoint(x, y);
    if (region) {
      this.selectedRegion = region;
      this.drawMap();
      return;
    }
    this.isSelecting    = true;
    this.selectionStart = { x, y };
    this.selectionEnd   = { x, y };
    this.selectedRegion = null;
  }

  onMouseMove(e) {
    if (!this.isSelecting) return;
    const rect = this.canvas.getBoundingClientRect();
    this.selectionEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.drawMap();
  }

  onMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    const a = this.pixelToLonLat(this.selectionStart.x, this.selectionStart.y);
    const b = this.pixelToLonLat(this.selectionEnd.x,   this.selectionEnd.y);
    this.selectedRegion = {
      centerLon: (a.lon + b.lon) / 2,
      centerLat: (a.lat + b.lat) / 2,
      zoom:      Math.abs(b.lon - a.lon) * 0.8,
      name:      'Выбранная область'
    };
  }

  getRegionAtPoint(x, y) {
    return Object.values(this.predefinedRegions).find(r => {
      const p = this.lonLatToPixel(r.centerLon, r.centerLat);
      return Math.hypot(x - p.x, y - p.y) <= 15;
    }) || null;
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
