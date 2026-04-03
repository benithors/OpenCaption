import type {AppBridge} from './ipc';

declare global {
  interface Window {
    appBridge: AppBridge;
  }
}

export {};
