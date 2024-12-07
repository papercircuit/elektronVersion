const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const listingService = require('../services/listingService');
const databaseAPI = require('../api/database');

let mainWindow;
let fetchInterval;

function sendDataToRenderer(listings) {
  if (!mainWindow) return;

  console.log('Sending data to renderer:', listings.length, 'listings');
  
  // Format listings for the renderer
  const listingItems = listings.map(listing => ({
    id: listing.id,
    make: listing.make,
    model: listing.model,
    finish: listing.finish,
    price: listing.price?.amount || listing.price || 0,
    averagePrice: listing.averagePrice || 0,
    currentVsAverage: listing.currentVsAverage || 0,
    title: listing.title
  }));
  
  // Send chart data
  const labels = listings.map(listing => new Date(listing.created_at).toLocaleString());
  const data = listings.map(listing => listing.price?.amount || listing.price || 0);
  
  mainWindow.webContents.send('update-chart-data', { labels, data });
  mainWindow.webContents.send('update-listings', listingItems);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Load the main HTML file
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../renderer/main.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    clearInterval(fetchInterval);
    mainWindow = null;
  });
}

async function initialize() {
  try {
    // Connect to database
    await databaseAPI.connect();
    console.log('Database connected successfully');

    // Set up listing service listener
    listingService.addListener((listings) => {
      if (mainWindow) {
        sendDataToRenderer(listings);
      }
    });

    // Initial fetch
    await listingService.fetchAndProcessListings();
    console.log('Initial listings fetch completed');

    // Set up periodic fetching
    const interval = 3600000; // 1 hour
    fetchInterval = setInterval(async () => {
      try {
        await listingService.fetchAndProcessListings();
      } catch (error) {
        console.error('Failed to fetch and process listings:', error);
        mainWindow?.webContents.send('message', 'Error fetching listings: ' + error.message);
      }
    }, interval);

  } catch (error) {
    console.error('Initialization error:', error);
    mainWindow?.webContents.send('message', 'Initialization error: ' + error.message);
  }
}

// IPC Handlers
ipcMain.on('fetch-listings', async () => {
  try {
    await listingService.fetchAndProcessListings();
    mainWindow?.webContents.send('message', 'Listings refreshed successfully');
  } catch (error) {
    console.error('Manual fetch failed:', error);
    mainWindow?.webContents.send('message', 'Manual fetch failed: ' + error.message);
  }
});

ipcMain.on('change-interval', (event, newInterval) => {
  if (fetchInterval) {
    clearInterval(fetchInterval);
  }
  
  fetchInterval = setInterval(async () => {
    try {
      await listingService.fetchAndProcessListings();
    } catch (error) {
      console.error('Failed to fetch and process listings:', error);
    }
  }, newInterval);
  
  mainWindow?.webContents.send('message', `Fetch interval updated to ${newInterval/1000} seconds`);
});

// App event handlers
app.on('ready', async () => {
  createWindow();
  await initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  mainWindow?.webContents.send('message', 'Critical error: ' + error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  mainWindow?.webContents.send('message', 'Critical error: ' + error.message);
});