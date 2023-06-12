const { ipcRenderer } = require('electron');

// Obtain references to the necessary elements
const listingsContainer = document.getElementById('listings-container');

// Listen for 'listings' event from the main process
ipcRenderer.on('listings', (event, listings) => {
  console.log('ipcRenderer received listings');
  // Clear the listings container
  listingsContainer.innerHTML = '';

  // Prepare data for the chart
  const labels = listings.map(listing => new Date(listing.created_at).toLocaleString());
  const data = listings.map(listing => listing.price);

  // Render the chart
  renderChart(labels, data);

  // Render the listings
  renderListings(listings);

  console.log('Listings rendered.');
});

// Function to render the chart
function renderChart(labels, data) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  const chart = new Chart(ctx, {
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
}

// Function to render the listings
function renderListings(listingItems) {
  const listingsContainer = document.getElementById('listings-container');
  listingsContainer.innerHTML = listingItems.map(item => `<li>${item}</li>`).join('');
}
