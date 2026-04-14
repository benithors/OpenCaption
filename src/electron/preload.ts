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
  exportSubtitledVideo: (payload) => ipcRenderer.invoke('export:video', payload),
};

contextBridge.exposeInMainWorld('appBridge', bridge);
