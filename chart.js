const Chart = require('chart.js');
const priceChartCanvas = document.getElementById('price-chart');

// Create an initial empty price chart
const priceChart = new Chart(priceChartCanvas, {
  type: 'line',
  data: {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Price',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        fill: true,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM D, YYYY h:mm:ss A',
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  },
});
