import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'TallyLens - Image Bill to Tally Importer',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // File Dialog Handlers
  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Bill Images or Scans',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images & Invoices', extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths;
  });

  ipcMain.handle('dialog:saveFile', async (_, defaultPath: string, extensions: string[]) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [{ name: 'Export File', extensions }],
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle('fs:saveFile', async (_, filePath: string, content: string | Uint8Array) => {
    try {
      await fs.promises.writeFile(filePath, content);
      return true;
    } catch (e) {
      console.error('File write error:', e);
      return false;
    }
  });

  // Native Tally HTTP Request Handler (Bypasses any browser CORS)
  ipcMain.handle('tally:request', async (_, urlString: string, xmlBody: string) => {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(urlString);
        const options: http.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 9000,
          path: parsedUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml;charset=utf-8',
            'Content-Length': Buffer.byteLength(xmlBody, 'utf8'),
          },
          timeout: 10000,
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode || 200, text: data });
          });
        });

        req.on('error', (err) => {
          resolve({ status: 500, text: `<ERROR>${err.message}</ERROR>` });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ status: 504, text: '<ERROR>Request timed out connecting to Tally</ERROR>' });
        });

        req.write(xmlBody);
        req.end();
      } catch (e: any) {
        resolve({ status: 500, text: `<ERROR>${e.message}</ERROR>` });
      }
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
