// Obtain references to the necessary elements
const listingsContainer = document.getElementById('listings-container');
const selectListingIds = document.getElementById('select-listing-ids');
let chart = null;

// Add these variables at the top
let currentListings = [];
let sortColumn = null;
let sortDirection = 'asc';
let searchTerm = '';
let filterColumn = 'all';
let listingsPerPage = 300;

// Function to render the chart
function renderChart(labels, data) {
  try {
    const ctx = document.getElementById('price-chart').getContext('2d');
    console.log('Rendering chart with:', { labels: labels.length, data: data.length });

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Listing Price',
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error rendering chart:', error);
  }
}

function renderListings(listings) {
  currentListings = listings;
  
  // Filter listings
  let filteredListings = currentListings.filter(listing => {
    if (!searchTerm) return true;
    
    if (filterColumn === 'all') {
      return Object.values(listing).some(value => 
        String(value).toLowerCase().includes(searchTerm)
      );
    }
    
    return String(listing[filterColumn]).toLowerCase().includes(searchTerm);
  });

  // Sort listings
  if (sortColumn) {
    filteredListings.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string values
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    });
  }

  // Limit to listings per page
  if (listingsPerPage !== 'all') {
    filteredListings = filteredListings.slice(0, parseInt(listingsPerPage));
  }

  // Clear the listings container
  listingsContainer.innerHTML = '';

  // Create the table
  const table = document.createElement('table');
  table.classList.add('listings-table');

  // Create header row with sorting
  const headerRow = document.createElement('tr');
  const headers = ['ID', 'Make', 'Model', 'Finish', 'Price', 'Avg Price', 'vs Avg %'];
  const columns = ['id', 'make', 'model', 'finish', 'price', 'averagePrice', 'currentVsAverage'];
  
  headers.forEach((header, index) => {
    const th = document.createElement('th');
    th.textContent = header;
    th.dataset.column = columns[index];
    
    if (sortColumn === columns[index]) {
      th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    
    th.addEventListener('click', () => {
      if (sortColumn === columns[index]) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = columns[index];
        sortDirection = 'asc';
      }
      renderListings(currentListings);
    });
    
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  // Iterate over the listings and create table rows
  filteredListings.forEach(listing => {
    const row = document.createElement('tr');
    const price = typeof listing.price === 'string' ? parseFloat(listing.price) : (listing.price || 0);
    const avgPrice = typeof listing.averagePrice === 'string' ? parseFloat(listing.averagePrice) : (listing.averagePrice || 0);
    const vsAvg = typeof listing.currentVsAverage === 'number' ? listing.currentVsAverage : 0;
    
    row.innerHTML = `
      <td>${listing.id || 'N/A'}</td>
      <td>${listing.make || 'N/A'}</td>
      <td>${listing.model || 'N/A'}</td>
      <td>${listing.finish || 'N/A'}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${avgPrice.toFixed(2)}</td>
      <td>${vsAvg.toFixed(1)}%</td>
    `;
    table.appendChild(row);
  });

  listingsContainer.appendChild(table);
}

document.addEventListener('DOMContentLoaded', () => {
  const intervalSelect = document.getElementById('interval-select');
  
  const intervals = [
      { value: 3600000, label: '1 hour' },      // 1 hour in milliseconds
      { value: 43200000, label: '12 hours' },   // 12 hours
      { value: 86400000, label: '1 day' },      // 24 hours
      { value: 604800000, label: '1 week' }     // 7 days
  ];
  
  intervals.forEach(interval => {
      const option = document.createElement('option');
      option.value = interval.value;
      option.textContent = interval.label;
      intervalSelect.appendChild(option);
  });

  // Add new event listeners
  document.getElementById('listings-per-page').addEventListener('change', (e) => {
    listingsPerPage = parseInt(e.target.value);
    renderListings(currentListings);
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderListings(currentListings);
  });

  document.getElementById('filter-column').addEventListener('change', (e) => {
    filterColumn = e.target.value;
    renderListings(currentListings);
  });

  document.getElementById('refresh-listings').addEventListener('click', () => {
    window.electronAPI.fetchListings();
  });
});

// Update the event listeners to use the exposed API
window.electronAPI.onUpdateChartData((event, { labels, data }) => {
  console.log('Received chart data update:', { labels, data });
  renderChart(labels, data);
});

window.electronAPI.onUpdateListings((event, listingItems) => {
  console.log('Received listings update:', listingItems);
  if (Array.isArray(listingItems)) {
    renderListings(listingItems);
  } else {
    console.error('Received invalid listings data:', listingItems);
  }
});

window.electronAPI.onMessage((event, message) => {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  document.getElementById('message-container').appendChild(messageElement);
});

window.electronAPI.onListings((event, listings) => {
  console.log('Received initial listings:', listings.length);
  renderListings(listings);
});