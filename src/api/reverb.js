const axios = require('axios');

class ReverbAPI {
  constructor() {
    this.baseURL = 'https://api.reverb.com/api';
    this.headers = {
      'Accept-Version': '3.0',
      'Accept': 'application/hal+json',
      'Content-Type': 'application/hal+json',
      'Accept-Language': 'en',
      'X-Display-Currency': 'USD',
      'X-Shipping-Region': 'US'
    };
  }

  async fetchListings(perPage = 300) {
    try {
      const response = await axios.get(
        `${this.baseURL}/listings/all?per_page=${perPage}&sort=created_at`,
        { headers: this.headers }
      );
      return response.data.listings;
    } catch (error) {
      console.error('Error fetching listings from Reverb:', error);
      throw error;
    }
  }
}

module.exports = new ReverbAPI();