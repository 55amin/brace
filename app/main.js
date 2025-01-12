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

function appendError(message) {
    mainWindow.webContents.send('show-error', message);
}

// Validation functions
function validateName(name) {
    const regex = /^[A-Za-zÀ-ÿ\-']{2,20}$/; 
    const isValid = regex.test(name);

    if (!isValid) {
        appendError("Invalid name. Please enter a name between 2 and 20 characters, containing only letters, accents, hyphens, and apostrophes.");
        return ''; 
    }
    return name; // Return empty string if invalid, return name if valid
}

function validateEmail(email) {
    const normalised = email.toLowerCase(); 
    
    if (normalised.length > 320) {
        appendError("Email address is too long. Maximum length is 320 characters.");
        return ''; 
    } else {
        const regex = /^[a-zA-Z0-9._%+-]{2,64}@[a-zA-Z0-9.-]{3,253}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
        const isValid = regex.test(normalised);
        
        if (!isValid) {
            appendError("Invalid email address. Please enter an email address in valid format (e.g., example@domain.com).");
            return ''; 
        }
        return normalised; // Return empty string if invalid, return normalised email address if valid
    }
}

function validatePhone(phone) {
    const regex = /^0\d{10}$/; 
    const isValid = regex.test(phone);

    if (!isValid) {
        appendError("Invalid phone number. Please enter a valid UK phone number starting with 0, containing exactly 11 digits.");
        return ''; 
    }
    return phone; // Return empty string if invalid, return phone number if valid
}

function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,20}$/;
    const isValid = regex.test(password);

    if (!isValid) {
        appendError("Invalid password. Password must be 8-20 characters long, containing at least one number, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &, .).");
        return '';
    }
    return password; // Return empty string if invalid, return password if valid
}

// Launch start-up screen (or set-up screen if no admins in database)
app.on('ready', () => {
    connection.query('SELECT COUNT(*) AS count FROM administrators', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return;
        }

        mainWindow = new BrowserWindow({
            width: 1920,
            height: 1080,
            webPreferences: {
                preload: path.join(__dirname, './frontend/preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                icon: path.join(__dirname, 'media/bracelogo.png')
            }
        });

        if (results[0].count > 0) {
            mainWindow.loadFile('./app/frontend/index.html');
        } else {
            mainWindow.loadFile('./app/frontend/setup.html'); 
        }
    });
});

// Add admin details to database
ipcMain.handle('create-admin', async (event, adminData) => {
    forename = validateName(adminData.forename);
    surname = validateName(adminData.surname);
    email = validateEmail(adminData.email);
    phone = validatePhone(adminData.phone);
    password = validatePassword(adminData.password);
    
    if (forename === '' || surname === '' || email === '' || phone === '' || password === '') {
        return { success: false, message: 'Invalid input' };
    }

    try {
        const [rowsEmail] = await connection.promise().query(
            'SELECT COUNT(*) as count FROM administrators WHERE email = ?',
            [email] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            return { success: false, message: 'Email address already registered' };
        }

        const [rowsPhone] = await connection.promise().query(
            'SELECT COUNT(*) as count FROM administrators WHERE phone = ?',
            [phone] // Check if phone number exists in database
        );
        if (rowsPhone[0].count > 0) {
            return { success: false, message: 'Phone number already registered' };
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Apply hashing algorithm to password
        const query = 'INSERT INTO administrators (forename, surname, email, phone, hashed_password) VALUES (?, ?, ?, ?, ?)';
        const values = [forename, surname, email, phone, hashedPassword];

        return new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
                if (err) {
                    console.error('Error inserting admin:', err);
                    reject({ success: false, message: 'Database error' });
                } else {
                    const adminID = results.insertId;
                    const newAdmin = new Administrator(forename, surname, email, phone, hashedPassword);
                    newAdmin.setAdminID(adminID); // Create new admin instance and add adminID from database
                    admins.push(newAdmin); // Add new admin to array 
                    resolve({ success: true, message: 'Administrator account created successfully!' });
                }
            });
        });
    } catch (err) {
        console.error('Error creating admin:', err);
        return { success: false, message: 'Failed to create administrator account' };
    }
});
 
// Check if agent exists in database
ipcMain.handle('check-agent', async () => {
    try {
        return new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) AS count FROM agents', (err, results) => {
                if (err) {
                    console.error('Error checking for agents:', err);
                    reject({ success: false, message: 'Database error' }); 
                } else {
                    const count = results[0].count; 
                    resolve({ success: true, exists: count > 0 });
                }
            });
        });
    } catch (err) {
        console.error('Error checking for agents:', err);
        return { success: false, message: 'Failed to check for agents' };
    }
}); 

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { 
        app.quit();  // Closes app when all windows are closed
        connection.end(); // Ends database connection when app is closed
    }
});