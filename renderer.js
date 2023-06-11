const { contextBridge, ipcRenderer } = require('electron');

// Expose the necessary Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: ipcRenderer,
});

// Handle the 'message' event from the main process
ipcRenderer.on('message', (event, message) => {
  // Display the message in the app
  const messageContainer = document.getElementById('message-container');
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);
});
