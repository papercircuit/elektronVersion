const Chart = require('chart.js');
const ctx = document.getElementById('price-chart').getContext('2d');
let priceChart;

document.addEventListener('DOMContentLoaded', (event) => {
  const { send, on } = window.electron;
  const startButton = document.getElementById('start-button');
  const intervalSelect = document.getElementById('interval-select');
  const listingsContainer = document.getElementById('listings-container');

  // Listen for 'listings' event from the main process
  on('listings', (event, listings) => {
    // Clear the listings container
    listingsContainer.innerHTML = '';

    // Prepare data for the chart
    const labels = listings.map(listing => new Date(listing.created_at).toLocaleString());
    const data = listings.map(listing => listing.price);

    // If chart does not exist, create it.
    if (!priceChart) {
      priceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Listing Price',
              data: data,
              borderColor: 'rgba(255, 99, 132, 1)'
            }
          ]
        },
        options: {
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true
                }
              }
            ]
          }
        }
      });
    } else {  // If chart already exists, update it.
      priceChart.data.labels = labels;
      priceChart.data.datasets[0].data = data;
      priceChart.update();
    }

    // Loop through the listings and create a list item for each listing
    for (const listing of listings) {
      const listItem = document.createElement('li');
      listItem.textContent = listing.title;

      // Append the list item to the listings container
      listingsContainer.appendChild(listItem);
    }
  });

  // Handle the start button click event
  startButton.addEventListener('click', () => {
    const interval = parseInt(intervalSelect.value);
    send('start-app', interval);
  });
});
