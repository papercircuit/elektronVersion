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
function renderListings(listings) {
  const listingsContainer = document.getElementById('listings-container');
  
  // Clear the listings container
  listingsContainer.innerHTML = '';

  // Create the table element
  const table = document.createElement('table');
  table.classList.add('listings-table');

  // Create the table header row
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>ID</th>
    <th>Make</th>
    <th>Model</th>
    <th>Finish</th>
    <th>Price</th>
  `;

  // Append the header row to the table
  table.appendChild(headerRow);

  // Iterate over the listings and create table rows
  listings.forEach(listing => {
    const { id, make, model, finish, price } = listing;

    // Create a table row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${id}</td>
      <td>${make}</td>
      <td>${model}</td>
      <td>${finish}</td>
      <td>${price}</td>
    `;

    // Append the row to the table
    table.appendChild(row);
  });

  // Append the table to the listings container
  listingsContainer.appendChild(table);
}
