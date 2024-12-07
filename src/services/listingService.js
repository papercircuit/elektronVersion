const reverbAPI = require('../api/reverb');
const databaseAPI = require('../api/database');

class ListingService {
  constructor() {
    this.listeners = new Set();
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(listings) {
    this.listeners.forEach(callback => callback(listings));
  }

  async fetchAndProcessListings() {
    try {
      console.log('Starting fetchAndProcessListings...');
      
      // Fetch from Reverb API
      const listings = await reverbAPI.fetchListings();
      console.log(`Fetched ${listings.length} listings from Reverb API`);
      
      // Process each listing
      for (const listing of listings) {
        try {
          const { averagePrice, currentVsAverage } = await databaseAPI.calculateAveragePrice(listing);
          listing.averagePrice = averagePrice;
          listing.currentVsAverage = currentVsAverage;
          await databaseAPI.insertListing(listing);
        } catch (error) {
          console.error('Error processing listing:', listing.id, error);
        }
      }

      // Get all listings from database
      const dbListings = await databaseAPI.getListings();
      console.log(`Retrieved ${dbListings.length} listings from database`);
      
      // Combine and deduplicate listings
      const allListings = [...listings];
      let duplicateCount = 0;
      dbListings.forEach(dbListing => {
        if (!allListings.find(l => l.id === dbListing.id)) {
          allListings.push(dbListing);
        } else {
          duplicateCount++;
        }
      });
      
      console.log(`Combined listings: ${allListings.length} (${duplicateCount} duplicates removed)`);
      this.notifyListeners(allListings);
      return allListings;
    } catch (error) {
      console.error('Error in fetchAndProcessListings:', error);
      throw error;
    }
  }
}

module.exports = new ListingService();