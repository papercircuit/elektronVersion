const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseAPI {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(
        path.resolve(__dirname, '../../listings.db'),
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          this.initializeDatabase();
          resolve();
        }
      );
    });
  }

  async initializeDatabase() {
    await this.createTables();
    await this.addNewColumns();
  }

  async createTables() {
    const createTableSQL = `CREATE TABLE IF NOT EXISTS listings (
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
    )`;

    return new Promise((resolve, reject) => {
      this.db.run(createTableSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async addNewColumns() {
    const columns = [
      { name: 'average_price', type: 'REAL' },
      { name: 'current_vs_average', type: 'REAL' }
    ];

    for (const column of columns) {
      await this.addColumnIfNotExists('listings', column.name, column.type);
    }
  }

  async addColumnIfNotExists(table, column, type) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT name FROM pragma_table_info('${table}') WHERE name='${column}'`,
        [],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            this.db.run(
              `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`,
              (err) => {
                if (err && !err.message.includes('duplicate column')) {
                  reject(err);
                  return;
                }
                resolve();
              }
            );
          } else {
            resolve();
          }
        }
      );
    });
  }

  async insertListing(listing) {
    const sql = `INSERT INTO listings (
      id, make, model, finish, year, title, created_at, shop_name,
      description, condition, condition_uuid, condition_slug, price,
      average_price, current_vs_average, inventory, has_inventory, 
      offers_enabled, auction, category_uuids, listing_currency, 
      published_at, buyer_price, state, shipping, slug, photos, 
      link_photo
    )
    VALUES (${',?'.repeat(28).substring(1)})
    ON CONFLICT (id) DO UPDATE SET 
    price = excluded.price,
    average_price = excluded.average_price,
    current_vs_average = excluded.current_vs_average`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        listing.id, listing.make, listing.model, listing.finish,
        listing.year, listing.title, listing.created_at, listing.shop_name,
        listing.description, listing.condition, listing.condition_uuid,
        listing.condition_slug, listing.price.amount, listing.averagePrice,
        listing.currentVsAverage, listing.inventory, listing.has_inventory,
        listing.offers_enabled, listing.auction, listing.category_uuids,
        listing.listing_currency, listing.published_at, listing.buyer_price.amount,
        listing.state.slug, JSON.stringify(listing.shipping), listing.slug,
        JSON.stringify(listing.photos), listing._links.photo.href
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getListings() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM listings ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async calculateAveragePrice(listing) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return new Promise((resolve, reject) => {
      this.db.all(
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

          resolve({ averagePrice, currentVsAverage });
        }
      );
    });
  }
}

module.exports = new DatabaseAPI();