export class ProfileChart {
  constructor(canvasId, width = 400, height = 200) {
    this.canvasId = canvasId;
    this.width = width;
    this.height = height;
    this.chart = null;
    this.initChart();
  }

  initChart() {
    const ctx = document.getElementById(this.canvasId);
    if (!ctx) {
      console.error('Canvas element not found:', this.canvasId);
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Высота (м)',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Профиль высоты',
            font: {
              size: 16,
              weight: 'bold'
            },
            color: '#374151'
          },
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#3b82f6',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `Высота: ${context.parsed.y.toFixed(0)} м`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Расстояние',
              font: {
                size: 12
              },
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: '#6b7280'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Высота (м)',
              font: {
                size: 12
              },
              color: '#6b7280'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: '#6b7280'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        elements: {
          point: {
            hoverRadius: 6
          }
        }
      }
    });
  }

  drawProfile(heights) {
    if (!this.chart) {
      console.error('Chart not initialized');
      return;
    }

    const labels = Array.from({ length: heights.length }, (_, i) => 
      `${((i / (heights.length - 1)) * 100).toFixed(0)}%`
    );

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = heights;
    this.chart.update('active');

    // Добавляем статистику
    const maxHeight = Math.max(...heights);
    const minHeight = Math.min(...heights);
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    
    console.log('Профиль высоты:', {
      максимальная: `${maxHeight.toFixed(0)} м`,
      минимальная: `${minHeight.toFixed(0)} м`,
      средняя: `${avgHeight.toFixed(0)} м`,
      перепад: `${(maxHeight - minHeight).toFixed(0)} м`
    });
  }

  clear() {
    if (this.chart) {
      this.chart.data.labels = [];
      this.chart.data.datasets[0].data = [];
      this.chart.update('active');
    }
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
} 