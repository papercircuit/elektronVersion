const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

async function fetchListings() {
  try {
    const response = await axios.get(
      'https://api.reverb.com/api/listings/all?per_page=10000&sort=listing_id'
    );

    const { listings } = response.data;

    let matchedListings = 0;

    for (const listing of listings) {
      const {
        id,
        make,
        model,
        finish,
        year,
        title,
        created_at,
        shop_name,
        description,
        condition,
        condition_uuid,
        condition_slug,
        price,
        inventory,
        has_inventory,
        offers_enabled,
        auction,
        category_uuids,
        listing_currency,
        published_at,
        buyer_price,
        state,
        shipping,
        slug,
        photos,
        _links
      } = listing;

      if (listing.listing_currency === 'USD') {
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
            id,
            make,
            model,
            finish,
            year,
            title,
            created_at,
            shop_name,
            description,
            condition,
            condition_uuid,
            condition_slug,
            price.amount,
            inventory,
            has_inventory,
            offers_enabled,
            auction,
            category_uuids,
            listing_currency,
            published_at,
            buyer_price.amount,
            state.slug,
            JSON.stringify(shipping),
            slug,
            JSON.stringify(photos),
            _links.photo.href
          ]
        );

        matchedListings++;
      }
    }

    const message = `Listings successfully fetched and processed. Matched listings: ${matchedListings}`;
    mainWindow.webContents.send('message', message);
    console.log(message);
  } catch (error) {
    console.error('Failed to fetch and process listings:', error);
    throw error; // Rethrow the error to handle it further if needed
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js') // Path to the preload script
    },
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'main.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  db = new sqlite3.Database('listings.db', (err) => {
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

    fetchListings();
    setInterval(fetchListings, 3600000); // Fetch every hour
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

ipcMain.on('fetchListings', (event) => {
  fetchListings()
    .then(() => {
      // Listings fetched successfully
    })
    .catch((error) => {
      console.error('Failed to fetch listings:', error);
    });
});
