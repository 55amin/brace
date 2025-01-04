const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Administrator = require('./frontend/models/administrator.js');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

let mainWindow;
const dbConfig = { // Configure database connection
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,  
    database: 'brace_db'
};
const connection = mysql.createConnection(dbConfig);
const admins = [];

// Launch setup screen
app.on('ready', async () => {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, './frontend/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.loadFile('./app/frontend/setup.html');  
});

// Add admin details to database
ipcMain.handle('create-admin', async (event, adminData) => {
    try {
        const hashedPassword = await bcrypt.hash(adminData.password, 10); // Apply hashing algorithm to password
        const query = 'INSERT INTO administrators (forename, surname, email, phone, hashed_password) VALUES (?, ?, ?, ?, ?)';
        const values = [adminData.forename, adminData.surname, adminData.email, adminData.phone, hashedPassword];

        return new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
                if (err) {
                    console.error('Error inserting admin:', err);
                    reject({ success: false, message: 'Database error' });
                } else {
                    const adminID = results.insertId;
                    const newAdmin = new Administrator(adminData.forename, adminData.surname, adminData.email, adminData.phone, hashedPassword);
                    newAdmin.setAdminID(adminID); // Create new admin instance and add adminID from database
                    admins.push(newAdmin); // Add new admin to array 

                    // Resolve success response
                    resolve({ success: true, message: 'Administrator account created successfully!' });
                }
            });
        });
    } catch (err) {
        console.error('Error creating admin:', err);
        return { success: false, message: 'Failed to create administrator account' };
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { 
        app.quit();  // Closes app when all windows are closed
        connection.end(); // Ends database connection when app is closed
    }
});