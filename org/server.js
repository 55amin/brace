const express = require('express');
const path = require('path');
const cors = require('cors');
const Administrator = require('./public/models/administrator');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const pool = mysql.createPool({ // Configure database connection
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'brace_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});
const admins = [];
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Check if an administrator exists in database
app.get('/api/check-admin', async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT COUNT(*) as count FROM administrators');
        const adminExists = rows[0].count > 0;
        
        if (adminExists) {
            res.json({ exists: true, message: 'Administrator found in database' });
        } else {
            res.json({ exists: false, message: 'No administrators found in database' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to check for administrators' });
    }
});

// Check if an agent exists in database
app.get('/api/check-agent', async (req, res) => {
    try {
        const [rows] = await pool.promise().query('SELECT COUNT(*) as count FROM agents');
        const agentExists = rows[0].count > 0;

        if (agentExists) {
            res.json({ exists: true, message: 'Agent found in database' });
        } else {
            res.json({ exists: false, message: 'No agents found in database' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to check for agents' });
    }
});

// Validation functions
function validateName(name) {
    const regex = /^[A-Za-zÀ-ÿ\-']{2,20}$/; 
    if (!regex.test(name)) {
        return { 
            isValid: false,
            error: "Invalid name. Please enter a name between 2 and 20 characters, containing only letters, accents, hyphens, and apostrophes."
        };
    }
    return { isValid: true, value: name };
}

function validateEmail(email) {
    const normalised = email.toLowerCase(); 
    
    if (normalised.length > 320) {
        return {
            isValid: false,
            error: "Email address is too long. Maximum length is 320 characters."
        };
    }

    const regex = /^[a-zA-Z0-9._%+-]{2,64}@[a-zA-Z0-9.-]{3,253}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
    if (!regex.test(normalised)) {
        return {
            isValid: false,
            error: "Invalid email address. Please enter an email address in valid format (e.g., example@domain.com)."
        };
    }
    return { isValid: true, value: normalised };
}

function validatePhone(phone) {
    const regex = /^0\d{10}$/; 
    if (!regex.test(phone)) {
        return {
            isValid: false,
            error: "Invalid phone number. Please enter a valid UK phone number starting with 0, containing exactly 11 digits."
        };
    }
    return { isValid: true, value: phone };
}

function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,20}$/;
    if (!regex.test(password)) {
        return {
            isValid: false,
            error: "Invalid password. Password must be 8-20 characters long, containing at least one number, one uppercase letter, one lowercase letter, and one special character (@, $, !, %, *, ?, &, .)."
        };
    }
    return { isValid: true, value: password };
}

// Create administrator account
app.post('/api/create-admin', async (req, res) => {
    const { forename, surname, email, phone, password } = req.body;
    const validatedForename = validateName(forename);
    const validatedSurname = validateName(surname);
    const validatedEmail = validateEmail(email);
    const validatedPhone = validatePhone(phone);
    const validatedPassword = validatePassword(password);
    // Push validation error messages to array
    const errors = [];
    if (!validatedForename.isValid) {
        errors.push(validatedForename.error);
    } else if (!validatedSurname.isValid) {
        errors.push(validatedSurname.error);
    }
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPhone.isValid) errors.push(validatedPhone.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const [rowsEmail] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM administrators WHERE email = ?',
            [validatedEmail.value] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                errors: ['Email address already registered'] 
            });
        }
        const [rowsPhone] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM administrators WHERE phone = ?',
            [validatedPhone.value] // Check if phone number exists in database
        );
        if (rowsPhone[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                errors: ['Phone number already registered'] 
            });
        }

        // Encrypt password using hashing algorithm, then insert admin details into database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        const query = 'INSERT INTO administrators (forename, surname, email, phone, hashed_password) VALUES (?, ?, ?, ?, ?)';
        const values = [
            validatedForename.value,
            validatedSurname.value,
            validatedEmail.value,
            validatedPhone.value,
            hashedPassword
        ];
        const [results] = await pool.promise().query(query, values);
        // Create new admin instance and add adminID from database
        const newAdmin = new Administrator(
            validatedForename.value,
            validatedSurname.value,
            validatedEmail.value,
            validatedPhone.value,
            hashedPassword
        );
        newAdmin.setAdminID(results.insertId);
        admins.push(newAdmin);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error creating admin:', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to create administrator account'] 
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Load admins into memory from database
    try {
        const [rows] = await pool.promise().query('SELECT * FROM administrators ORDER BY admin_id ASC');
        rows.forEach(row => {
            const admin = new Administrator(
                row.forename, row.surname, row.email, row.phone, row.hashed_password);
            admin.setAdminID(row.id);
            admins.push(admin);
        });
        console.log(`Loaded ${admins.length} administrators into memory.`);
    } catch (err) {
        console.error('Error loading admins from database:', err);
    }
});

// Close database connection
process.on('SIGINT', () => {
    pool.end();
    console.log('Database connection closed');
    process.exit();
});

