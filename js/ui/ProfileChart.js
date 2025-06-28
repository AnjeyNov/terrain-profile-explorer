export class ProfileChart {
  constructor(canvasId, width = 600, height = 160) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = width;
    this.height = height;
    
    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  drawProfile(heights) {
    this.clear();
    this.drawGrid();
    this.drawProfileLine(heights);
    this.drawLabels(heights);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * this.width;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * this.height;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawProfileLine(heights) {
    if (!heights || heights.length === 0) return;

    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    
    this.ctx.beginPath();
    heights.forEach((h, i) => {
      const x = i / (heights.length - 1) * this.width;
      const y = this.height - (h - minH) / (maxH - minH) * this.height;
      i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y);
    });
    
    this.ctx.strokeStyle = '#ff6600';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  drawLabels(heights) {
    if (!heights || heights.length === 0) return;

    const minH = Math.min(...heights);
    const maxH = Math.max(...heights);
    const diff = maxH - minH;

    this.ctx.fillStyle = '#222';
    this.ctx.font = '12px sans-serif';
    this.ctx.fillText(`min ${Math.round(minH)} m`, 4, 14);
    this.ctx.fillText(`max ${Math.round(maxH)} m`, 4, 28);
    this.ctx.fillText(`разность ${Math.round(diff)} m`, 4, 42);
    
    const avgH = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    this.ctx.fillText(`средняя ${Math.round(avgH)} m`, 4, 56);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.setupCanvas();
  }

  exportAsImage() {
    return this.canvas.toDataURL('image/png');
  }
} 