const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateChartData: (callback) => ipcRenderer.on('update-chart-data', callback),
  onUpdateListings: (callback) => ipcRenderer.on('update-listings', callback),
  onMessage: (callback) => ipcRenderer.on('message', callback),
  onListings: (callback) => ipcRenderer.on('listings', callback),
  fetchListings: () => ipcRenderer.send('fetch-listings'),
  changeInterval: (interval) => ipcRenderer.send('change-interval', interval)
});