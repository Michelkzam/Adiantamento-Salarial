const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dbLoad: () => ipcRenderer.invoke('db-load'),
  dbSave: (bytes) => ipcRenderer.invoke('db-save', bytes),
  dbExport: (bytes) => ipcRenderer.invoke('db-export', bytes),
  dbImport: () => ipcRenderer.invoke('db-import'),
});
