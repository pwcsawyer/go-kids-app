const { app, BrowserWindow, Menu } = require('electron');

// Linux 容器里 Chromium 沙箱经常起不来。Mac 上不要设这个变量。
if (process.env.GOKIDS_NO_SANDBOX === '1') {
  app.commandLine.appendSwitch('no-sandbox');
}
const fs = require('fs');
const path = require('path');
const { startStaticServer } = require('./static-server');

const TITLE = '五岁小朋友围棋学习';

/** 内容区尺寸。9 路在 1000×760 时格子仍 ≥ 56 CSS 像素，见 fitBoard。 */
const DEFAULT_WIDTH = 1180;
const DEFAULT_HEIGHT = 820;
const MIN_WIDTH = 1000;
const MIN_HEIGHT = 760;

app.setName(TITLE);

function distDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'dist');
  return path.join(__dirname, '..', 'dist');
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    useContentSize: true,
    title: TITLE,
    backgroundColor: '#FFF8EC',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.on('page-title-updated', (event) => {
    event.preventDefault();
  });
  win.webContents.on('did-finish-load', () => {
    win.setTitle(TITLE);
    win.webContents.setZoomFactor(1);
    win.webContents
      .insertCSS(
        'html, body, #root { height: 100%; margin: 0; background: #FFF8EC; } body { overflow: hidden; }',
      )
      .catch(() => {});
    win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  });
  win.once('ready-to-show', () => win.show());
  void win.loadURL(`http://127.0.0.1:${port}/`);
  return win;
}

function installMenu() {
  const template = [
    {
      label: TITLE,
      submenu: [{ role: 'quit', label: '退出' }],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'reload', label: '重新载入' },
        { role: 'minimize', label: '最小化' },
        { role: 'togglefullscreen', label: '进入全屏' },
        { role: 'close', label: '关闭' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    const dist = distDir();
    if (!fs.existsSync(path.join(dist, 'index.html'))) {
      console.error('缺少导出的界面。请在 app 目录执行 npm run mac。');
      app.quit();
      return;
    }
    installMenu();
    const { port } = await startStaticServer(dist);
    createWindow(port);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
