import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFileDialog: () => Promise<string[] | null>;
  saveFileDialog: (defaultPath: string, extensions: string[]) => Promise<string | null>;
  saveFile: (filePath: string, content: string | Uint8Array) => Promise<boolean>;
  tallyRequest: (url: string, xmlBody: string) => Promise<{ status: number; text: string }>;
  isElectron: boolean;
}

const api: ElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath, extensions) => ipcRenderer.invoke('dialog:saveFile', defaultPath, extensions),
  saveFile: (filePath, content) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  tallyRequest: (url, xmlBody) => ipcRenderer.invoke('tally:request', url, xmlBody),
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
