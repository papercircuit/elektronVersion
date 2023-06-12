const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;
let fetchInterval;

// Function to render the chart
function renderChart(labels, data) {
  mainWindow.webContents.executeJavaScript(`renderChart(${JSON.stringify(labels)}, ${JSON.stringify(data)})`);
}

// Function to render the listings
function renderListings(listings) {
  const listingItems = listings.map(listing => ({
    id: listing.id,
    make: listing.make,
    model: listing.model,
    finish: listing.finish,
    price: listing.price.amount,
    title: listing.title
  }));
  mainWindow.webContents.executeJavaScript(`renderListings(${JSON.stringify(listingItems)})`);
}


async function fetchListings() {
  console.log('Fetching listings...');
  mainWindow.webContents.send('message', 'Fetching listings...');

  try {
    const response = await axios.get(
      'https://api.reverb.com/api/listings/all?per_page=10000&sort=created_at'
    );

    const { listings } = response.data;

    let matchedListings = 0;

    console.log('Processing listings...');

    for (const listing of listings) {
      // Insert the listing into the SQLite database
      db.run(
        `INSERT INTO listings (
          id, make, model, finish, year, title, created_at, shop_name,
          description, condition, condition_uuid, condition_slug, price,
          inventory, has_inventory, offers_enabled, auction, category_uuids,
          listing_currency, published_at, buyer_price, state, shipping, slug,
          photos, link_photo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING`,
        [
          listing.id,
          listing.make,
          listing.model,
          listing.finish,
          listing.year,
          listing.title,
          listing.created_at,
          listing.shop_name,
          listing.description,
          listing.condition,
          listing.condition_uuid,
          listing.condition_slug,
          listing.price.amount,
          listing.inventory,
          listing.has_inventory,
          listing.offers_enabled,
          listing.auction,
          listing.category_uuids,
          listing.listing_currency,
          listing.published_at,
          listing.buyer_price.amount,
          listing.state.slug,
          JSON.stringify(listing.shipping),
          listing.slug,
          JSON.stringify(listing.photos),
          listing._links.photo.href
        ]
      );

      matchedListings++;
    }

    const message = `Listings successfully fetched and processed. Matched listings: ${matchedListings} at ${new Date().toLocaleString()}`;
    console.log(message);
    mainWindow.webContents.send('message', message);
    renderListings(listings); // Render the listings on the page
    return listings; // Return the listings data
  } catch (error) {
    console.error('Failed to fetch and process listings:', error);
    throw error; // Rethrow the error to handle it further if needed
  }
}


async function startApp(interval) {
  try {
    const listings = await fetchListings();
    console.log('Rendering listings...');
    mainWindow.webContents.send('listings', listings); // Send the initial listings data to the renderer process
    renderListings(listings); // Render the initial listings on the page
    renderChart(listings.map(listing => new Date(listing.created_at).toLocaleString()), listings.map(listing => listing.price.amount));

    fetchInterval = setInterval(async () => {
      try {
        const listings = await fetchListings();
        mainWindow.webContents.send('listings', listings); // Send the updated listings data to the renderer process
        renderListings(listings); // Render the updated listings on the page
        renderChart(listings.map(listing => new Date(listing.created_at).toLocaleString()), listings.map(listing => listing.price.amount));
      } catch (error) {
        console.error('Failed to fetch and process listings:', error);
      }
    }, interval);
  } catch (error) {
    console.error('Failed to fetch and process listings:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Path to the preload script
    }
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'main.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  mainWindow.on('closed', function () {
    clearInterval(fetchInterval);
    mainWindow = null;
  });

  db = new sqlite3.Database(path.resolve(__dirname, 'listings.db'), (err) => {
    if (err) {
      console.error('Failed to open database:', err);
      throw err;
    }

    // Create the listings table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      make TEXT,
      model TEXT,
      finish TEXT,
      year INTEGER,
      title TEXT,
      created_at TEXT,
      shop_name TEXT,
      description TEXT,
      condition TEXT,
      condition_uuid TEXT,
      condition_slug TEXT,
      price REAL,
      inventory INTEGER,
      has_inventory BOOLEAN,
      offers_enabled BOOLEAN,
      auction BOOLEAN,
      category_uuids TEXT,
      listing_currency TEXT,
      published_at TEXT,
      buyer_price REAL,
      state TEXT,
      shipping TEXT,
      slug TEXT,
      photos TEXT,
      link_photo TEXT
    )`);

    const interval = 5000; // Fetch every hour
    startApp(interval);

    setInterval(() => {
      fetchListings()
        .then((listings) => {
          console.log('Rendering listings...');
          mainWindow.webContents.send('listings', listings); // Send the updated listings data to the renderer process
          renderListings(listings); // Render the updated listings on the page
          console.log('Listings rendered.');
        })
        .catch((error) => {
          console.error('Failed to fetch and process listings:', error);
        });
    }, interval);
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.once('start-app', (event, interval) => {
  startApp(interval);
});
