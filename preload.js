const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const messageContainer = document.getElementById('message-container');
  ipcRenderer.on('message', (event, message) => {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageContainer.appendChild(messageElement);
  });
});
