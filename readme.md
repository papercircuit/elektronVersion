#Reverb Offer Automation

## Overview

I need an app to find all the newest listings on Reverb that accept offers, check the price history of sold items on that item, make sure highest sold and lowest sold is a difference of at least 30%, set up the lowest offer on that new listing, and then ask user to verify purchase 
A music store would make a killing with that script, cause new listings come up seconds after posting, but don’t show up in people’s feeds until hours later. I’ve literally just been scanning the “All New Listings” tab all day today and there are so many steals of deals I would have missed

This app should be able to run on a mac and will need to be able to run in the background without any user interaction.

## Features

- Fetch new listings from Reverb
- Check the price history of sold items on that item over time
- Make sure highest sold and lowest sold is a difference of at least 30%
- Set up the lowest offer on that new listing
- Notify via email or other notification method when a new listing is found that meets the criteria
- User can set the interval for how often the app should check for new listings
- User can specify which listings to track the price history of

## Technologies

- Electron for the app
- Node.js for the backend
- SQLite for the database

## Setup

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Run `npm run dev` to start the app   

## Notes

- This is a work in progress and is not yet functional
- See `index.js` for the main logic
- See `renderer.js` for the UI logic
- See `preload.js` for the communication logic between the main and renderer processes