const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('niyyah', {
  platform: 'electron',
  version: process.versions.electron,
  schedule: (events) => ipcRenderer.invoke('niyyah:schedule', events),
  cancel: () => ipcRenderer.invoke('niyyah:cancel'),
  test: () => ipcRenderer.invoke('niyyah:test'),
  getAutostart: () => ipcRenderer.invoke('niyyah:get-autostart'),
  setAutostart: (enabled) => ipcRenderer.invoke('niyyah:set-autostart', enabled),
});
