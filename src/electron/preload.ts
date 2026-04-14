import {contextBridge, ipcRenderer, webUtils} from 'electron';
import type {AppBridge} from '@shared/ipc';

const bridge: AppBridge = {
  importVideo: () => ipcRenderer.invoke('video:import'),
  importVideoFromPath: (filePath) => ipcRenderer.invoke('video:import-path', {filePath}),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  getPreviewVideoUrl: (videoPath) => ipcRenderer.invoke('video:get-preview-url', {videoPath}),
  getSavedApiKey: () => ipcRenderer.invoke('settings:get-api-key'),
  saveApiKey: (payload) => ipcRenderer.invoke('settings:save-api-key', payload),
  transcribeVideo: (payload) => ipcRenderer.invoke('transcription:run', payload),
  onExportProgress: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) => listener(payload);
    ipcRenderer.on('export:progress', wrapped);
    return () => ipcRenderer.removeListener('export:progress', wrapped);
  },
  exportSubtitledVideo: (payload) => ipcRenderer.invoke('export:video', payload),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  openContainingFolder: (payload) => ipcRenderer.invoke('export:open-containing-folder', payload),
};

contextBridge.exposeInMainWorld('appBridge', bridge);
