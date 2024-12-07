const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;
let fetchInterval;
let allListings = [];

// Function to render the chart
function sendDataToRenderer(listings) {
  console.log('Sending data to renderer:', listings.length, 'listings');
  console.log('Sample listing:', listings[0]); // Debug log
  
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
  
  console.log('Processed listing items:', listingItems.length); // Debug log
  console.log('Sample processed item:', listingItems[0]); // Debug log
  
  const labels = listings.map(listing => new Date(listing.created_at).toLocaleString());
  const data = listings.map(listing => listing.price?.amount || listing.price || 0);
  
  mainWindow.webContents.send('update-chart-data', { labels, data });
  mainWindow.webContents.send('update-listings', listingItems);
}

// Function to get the average price over time for selected listing ID(s)
async function calculateAveragePrice(listing) {
  return new Promise((resolve, reject) => {
    // Query similar listings based on make and model from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    db.all(
      `SELECT price 
       FROM listings 
       WHERE make = ? 
       AND model = ? 
       AND created_at >= ?`,
      [listing.make, listing.model, thirtyDaysAgo.toISOString()],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          resolve({
            averagePrice: listing.price.amount,
            currentVsAverage: 0
          });
          return;
        }

        const prices = rows.map(row => row.price);
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const currentVsAverage = ((listing.price.amount - averagePrice) / averagePrice) * 100;

        resolve({
          averagePrice,
          currentVsAverage
        });
      }
    );
  });
}

async function fetchListings() {
  console.log('Fetching listings...');
  mainWindow.webContents.send('message', 'Fetching listings...');

  try {
    const response = await axios.get(
      'https://api.reverb.com/api/listings/all?per_page=300&sort=created_at',
      {
        headers: {
          'Accept-Version': '3.0',
          'Accept': 'application/hal+json',
          'Content-Type': 'application/hal+json',
          'Accept-Language': 'en',
          'X-Display-Currency': 'USD',
          'X-Shipping-Region': 'US'
        }
      }
    );

    const { listings } = response.data;

    let matchedListings = 0;

    console.log('Processing listings...');

    for (const listing of listings) {
      // Calculate average price and percentage difference
      const { averagePrice, currentVsAverage } = await calculateAveragePrice(listing);

      // Insert the listing into the SQLite database
      db.run(
        `INSERT INTO listings (
          id, make, model, finish, year, title, created_at, shop_name,
          description, condition, condition_uuid, condition_slug, price,
          average_price, current_vs_average, inventory, has_inventory, 
          offers_enabled, auction, category_uuids, listing_currency, 
          published_at, buyer_price, state, shipping, slug, photos, 
          link_photo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET 
        price = excluded.price,
        average_price = excluded.average_price,
        current_vs_average = excluded.current_vs_average`,
        [
          listing.id, listing.make, listing.model, listing.finish,
          listing.year, listing.title, listing.created_at, listing.shop_name,
          listing.description, listing.condition, listing.condition_uuid,
          listing.condition_slug, listing.price.amount, averagePrice,
          currentVsAverage, listing.inventory, listing.has_inventory,
          listing.offers_enabled, listing.auction, listing.category_uuids,
          listing.listing_currency, listing.published_at, listing.buyer_price.amount,
          listing.state.slug, JSON.stringify(listing.shipping), listing.slug,
          JSON.stringify(listing.photos), listing._links.photo.href
        ]
      );

      // Update the listing object with the calculated values
      listing.averagePrice = averagePrice;
      listing.currentVsAverage = currentVsAverage;

      matchedListings++;
    }

    const message = `Listings successfully fetched and processed. Matched listings: ${matchedListings} at ${new Date().toLocaleString()}`;
    console.log(message);
    mainWindow.webContents.send('message', message);
    sendDataToRenderer(listings);

    // After processing API listings, get additional listings from database
    db.all(`SELECT * FROM listings ORDER BY created_at DESC`, [], (err, dbListings) => {
      if (err) {
        console.error('Error fetching from database:', err);
        return;
      }
      
      // Combine API listings with database listings, removing duplicates
      const allListings = [...listings];
      dbListings.forEach(dbListing => {
        if (!allListings.find(l => l.id === dbListing.id)) {
          allListings.push(dbListing);
        }
      });
      
      // Send all listings to renderer
      sendDataToRenderer(allListings);
    });

    return listings;
  } catch (error) {
    console.error('Failed to fetch and process listings:', error);
    throw error; // Rethrow the error to handle it further if needed
  }
}


async function startApp(interval) {
  try {
    const listings = await fetchListings();
    console.log('Rendering listings...');
    sendDataToRenderer(listings);

    fetchInterval = setInterval(async () => {
      try {
        const listings = await fetchListings();
        sendDataToRenderer(listings);
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../renderer/main.html'),
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

    // Check if we need to add the new columns
    db.get("SELECT name FROM pragma_table_info('listings') WHERE name='average_price'", [], (err, row) => {
      if (err) {
        console.error('Error checking columns:', err);
        return;
      }

      if (!row) {
        // Add new columns if they don't exist
        db.run(`ALTER TABLE listings ADD COLUMN average_price REAL;`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding average_price column:', err);
          }
        });
        
        db.run(`ALTER TABLE listings ADD COLUMN current_vs_average REAL;`, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding current_vs_average column:', err);
          }
        });
      }
    });

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
      average_price REAL,
      current_vs_average REAL,
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

    const interval = 3600000; // 1 hour = 3600000
    startApp(interval);

    setInterval(() => {
      fetchListings()
        .then((listings) => {
          console.log('Rendering listings...');
          sendDataToRenderer(listings);
          console.log('Listings rendered.');
        })
        .catch((error) => {
          console.error('Failed to fetch and process listings:', error);
        });
    }, interval);
  });
}

// This will fetch all listings from the DATABASE and send them to the renderer process
ipcMain.on('fetch-listings', async (event) => {
  try {
    const listings = await fetchListings();
  } catch (error) {
    console.error('Failed to fetch and process listings:', error);
  }
});

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
