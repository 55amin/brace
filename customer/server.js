const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Customer = require('./public/models/customer');
const {
    validateUsername,
    validateEmail,
    validateTitle,
    validateDesc
} = require('./utils/validation');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({ // Configure database connection
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0
});

const sessionStore = new MySQLStore({ // Configure MySQL session store
    clearExpired: true,
    expiration: 1000 * 60 * 60 // Sessions expire after 1 hour of inactivity
}, pool);

app.set('trust proxy', 1);
app.use(session({ // Configure user session
    store: sessionStore,
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60
    }
}));

const transporter = nodemailer.createTransport({ // Configure email service
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
});

const customers = [];

app.get('/', (req, res) => {
    res.redirect('/index.html'); 
});

// Register customer
app.post('/api/customer-reg', async (req, res) => {
    const { username, email } = req.body;
    const validatedUsername = validateUsername(username);
    const validatedEmail = validateEmail(email);
    const errors = []; // Push validation error messages to array
    if (!validatedUsername.isValid) errors.push(validatedUsername.error);
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }
    try { 
        const [rowsEmail] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM customers WHERE email = ?',
            [validatedEmail.value] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            errors.push('Email address already registered');
            return res.status(400).json({ success: false, errors });
        }

        // Insert customer details into database
        const query = 'INSERT INTO customers (username, email, registered_at) VALUES (?, ?, ?)';
        const values = [validatedUsername.value, validatedEmail.value, new Date()];
        const [results] = await pool.promise().query(query, values);

        req.session.user = { email: validatedEmail.value, adminID: admin.adminID }; // Create session for user
        res.status(200).json({ success: true, message: 'Customer registered successfully' });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ success: false, message: 'Failed to register customer' });
    }
});


// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
});