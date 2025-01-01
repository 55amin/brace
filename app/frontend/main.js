const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs'); 
const mysql = require('mysql2');
require('dotenv').config();

let mainWindow;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: process.env.DB_PASSWORD, 
    database: 'brace_db'
});

// Administrator existence check
function checkAdminExists(callback) {
    connection.query('SELECT COUNT(*) AS count FROM administrators', (err, results) => {
        if (err) {
            console.error('Database query failed:', err);
            callback(false); 
        } else {
            const adminCount = results[0].count;
            callback(adminCount > 0); 
        }
    });
}

function createWindow(loadSetup) {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), 
            contextIsolation: true, // Separates the main world (web content) from the isolated world (back-end) for security
            nodeIntegration: false
        }
    });

    if (loadSetup) {
        mainWindow.loadFile('setup.html'); 
    } else {
        mainWindow.loadFile('index.html'); 
    }
}

app.on('ready', () => {
    checkAdminExists((adminExists) => {
        createWindow(!adminExists); 
    });
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit(); // Closes app when all windows are closed, except on MacOS due to operating system conventions
    }
});

ipcMain.on('create-admin', (event, data) => {
    const { forename, surname, email, phone, password } = data;

    const query = `
        INSERT INTO administrators (forename, surname, email, phone, password)
        VALUES (?, ?, ?, ?, ?)`;

    connection.query(query, [forename, surname, email, phone, password], (err) => {
        if (err) {
            console.error('Failed to create administrator:', err);
            event.reply('admin-created', { success: false, message: 'Failed to create administrator' });
        } else {
            console.log('Administrator account created successfully.');
            event.reply('admin-created', { success: true, message: 'Administrator created successfully' });

            // Close setup and launch startup
            mainWindow.loadFile('index.html');
        }
    });
});