const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Adiantamento Salarial - AMRY',
    icon: path.join(__dirname, '..', 'dist', 'logo-amry.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const DB_FILE = () => path.join(app.getPath('userData'), 'adiantamento.sqlite');
const BACKUP_DIR = () => path.join(app.getPath('userData'), 'backups');
const SQLITE_HEADER = 'SQLite format 3\u0000';

function isSqlite(buf) {
  return buf && buf.length > 100 && buf.subarray(0, 16).toString('latin1') === SQLITE_HEADER;
}

function dailyBackup() {
  const file = DB_FILE();
  if (!fs.existsSync(file)) return;
  const dir = BACKUP_DIR();
  fs.mkdirSync(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const target = path.join(dir, `adiantamento-${today}.sqlite`);
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
  const backups = fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite')).sort();
  backups.slice(0, Math.max(0, backups.length - 30)).forEach((f) => fs.unlinkSync(path.join(dir, f)));
}

ipcMain.handle('db-load', async () => {
  const file = DB_FILE();
  if (!fs.existsSync(file)) return null;
  return new Uint8Array(fs.readFileSync(file));
});

ipcMain.handle('db-save', async (_event, bytes) => {
  try {
    const buf = Buffer.from(bytes);
    if (!isSqlite(buf)) throw new Error('Conteúdo inválido');
    dailyBackup();
    const file = DB_FILE();
    const tmp = `${file}.tmp`;
    const fd = fs.openSync(tmp, 'w');
    fs.writeSync(fd, buf);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tmp, file);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error && error.message ? error.message : error) };
  }
});

ipcMain.handle('db-export', async (_event, bytes) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar backup do banco de dados',
    defaultPath: `backup_adiantamentos_${new Date().toISOString().slice(0, 10)}.sqlite`,
    filters: [{ name: 'Banco SQLite', extensions: ['sqlite'] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };
  try {
    fs.writeFileSync(filePath, Buffer.from(bytes));
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('db-import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restaurar backup do banco de dados',
    filters: [{ name: 'Banco SQLite', extensions: ['sqlite'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  const buf = fs.readFileSync(filePaths[0]);
  if (!isSqlite(buf)) throw new Error('O arquivo selecionado não é um banco SQLite válido.');
  return new Uint8Array(buf);
});
