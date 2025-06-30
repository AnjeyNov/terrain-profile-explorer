export class ProfileChart {
  constructor(canvasId, width = 400, height = 200) {
    this.canvasId = canvasId;
    this.width    = width;
    this.height   = height;
    this.chart    = null;
    this.initChart();
  }

  initChart() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) {
      console.error('Canvas not found:', this.canvasId);
      return;
    }

    this.chart = new Chart(canvas, {
      type: 'line', // всё ещё «line», но с fill:true это area
      data: {
        labels: [],
        datasets: [{
          label: 'Высота (м)',
          data: [],
          borderColor: '#3b82f6',
          borderWidth: 2,
          fill: 'start',       // заливать от линии до низа
          tension: 0.5,        // плавность кривой (0..1)
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#3b82f6',

          // вот функция, создающая градиент, меняющий цвет в точке y=0
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const {ctx: c, chartArea} = chart;
            if (!chartArea) {
              // ещё не инициали­зировалось layout, вернём «запасной» цвет
              return 'rgba(59,130,246,0.1)';
            }
            const {top, bottom} = chartArea;
            // пиксель по оси Y, соответствующий нулевой высоте
            const yZero = chart.scales.y.getPixelForValue(0);

            const grad = c.createLinearGradient(0, top, 0, bottom);
            // Clamp the gradient stop value between 0 and 1
            const gradientStop = Math.max(0, Math.min(1, (yZero - top) / (bottom - top)));
            // от верха до yZero — зелёный
            grad.addColorStop(0, 'rgba(34,197,94,0.5)');
            grad.addColorStop(gradientStop, 'rgba(34,197,94,0.5)');
            // от yZero до низа — синий
            grad.addColorStop(gradientStop, 'rgba(59,130,246,0.5)');
            grad.addColorStop(1, 'rgba(59,130,246,0.5)');

            return grad;
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          title: {
            display: true,
            text: 'Профиль высоты',
            font: { size: 16, weight: 'bold' },
            color: '#374151'
          },
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#3b82f6',
            borderWidth: 1,
            callbacks: {
              label: ctx => `Высота: ${ctx.parsed.y.toFixed(0)} м`
            }
          }
        },

        scales: {
          x: {
            title: {
              display: true,
              text: 'Расстояние',
              font: { size: 12 },
              color: '#6b7280'
            },
            grid: { color: 'rgba(0,0,0,0.1)' },
            ticks: { color: '#6b7280' }
          },
          y: {
            title: {
              display: true,
              text: 'Высота (м)',
              font: { size: 12 },
              color: '#6b7280'
            },
            grid: { color: 'rgba(0,0,0,0.1)' },
            ticks: {
              color: '#6b7280',
              // грубо отметим 0, чтобы видеть границу
              callback: v => v === 0 ? '0 м' : v
            }
          }
        },

        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },

        elements: {
          point: { hoverRadius: 6 }
        }
      }
    });
  }

  drawProfile(heights) {
    if (!this.chart) return;

    this.chart.data.labels = heights.map((_, i) =>
      `${((i / (heights.length - 1)) * 100).toFixed(0)}%`
    );
    this.chart.data.datasets[0].data = heights;
    this.chart.update();

    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);
    const avgH = heights.reduce((a,b) => a+b,0) / heights.length;
    console.log({
      максимальная: `${maxH.toFixed(0)} м`,
      минимальная: `${minH.toFixed(0)} м`,
      средняя:     `${avgH.toFixed(0)} м`,
      перепад:     `${(maxH - minH).toFixed(0)} м`
    });
  }

  clear() {
    if (!this.chart) return;
    this.chart.data.labels = [];
    this.chart.data.datasets[0].data = [];
    this.chart.update();
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
