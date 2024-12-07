const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateChartData: (callback) => {
    ipcRenderer.on('update-chart-data', (event, data) => callback(event, data));
  },
  onUpdateListings: (callback) => {
    ipcRenderer.on('update-listings', (event, data) => callback(event, data));
  },
  onMessage: (callback) => {
    ipcRenderer.on('message', (event, data) => callback(event, data));
  },
  onListings: (callback) => {
    ipcRenderer.on('listings', (event, data) => callback(event, data));
  },
  fetchListings: () => ipcRenderer.send('fetch-listings')
});