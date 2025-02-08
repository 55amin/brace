const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Administrator = require('./public/models/administrator');
const Agent = require('./public/models/agent');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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
    expiration: 1000 * 60 * 10 // Sessions expire after 10 minutes of inactivity
}, pool); 

app.set('trust proxy', 1);
app.use(session({ // Configure user session
    store: sessionStore, 
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 10
    }
}));

app.use((req, res, next) => {
    if (req.session) {
        req.session.touch(); // Refresh session upon user interaction
    }
    next();
});

const transporter = nodemailer.createTransport({ // Configure email service
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_ADDRESS, 
        pass: process.env.EMAIL_PASSWORD 
    }
});

const admins = [];
const agents = [];

// Check if admin is authenticated
function isAuthenticatedAdmin(req, res, next) { // Check if session exists and user is logged in as an admin
    if (req.session && req.session.user && req.session.user.adminID) { 
        return next();
    } else { // Redirect to startup page if user is not authenticated
        res.redirect('public/index.html');
    }
}

app.get('/', (req, res) => {
    res.redirect('/index.html'); // Redirect to your main page
});

app.get('/adminscreen.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adminscreen.html'));
});

app.get('/settings.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/manageaccount.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manageaccount.html'));
});

app.get('/manageadmin.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manageadmin.html'));
});

app.get('/createadmin.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createadmin.html'));
});

app.get('/manageagent.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manageagent.html'));
});

app.get('/createagent.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createagent.html'));
});

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

// Send verification email and verify code
app.post('/api/email-code', async (req, res) => {
    const { email, type } = req.body;
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // Generate 6 character alphanumeric code
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        await pool.promise().query( // Delete any existing codes if a user tries to resend email
            'DELETE FROM verifications WHERE email = ?',
            [email]);

        await pool.promise().query( // Insert email address and verification code into database
            'INSERT INTO verifications (email, code, type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)', 
            [email, code, type, createdAt, expiresAt]);

        let subject; // Define subject and message depending on type
        let message; 

        if (type === 'email') { 
            subject = 'Brace: Verify your email address';
            message = `To verify your email address, enter this verification code: ${code}\n\nThis code will expire in 10 minutes.\n\nBrace for Techmedic`;
        } else if (type === 'password') {
            subject = 'Brace: Reset your password';
            message = `To reset your password, enter this verification code: ${code}\n\nThis code will expire in 10 minutes.\n\nBrace for Techmedic`;
        }

        await transporter.sendMail({ // Send verification email
            from: `Brace for Techmedic <${process.env.EMAIL_ADDRESS}>`,
            to: email,
            subject,
            text: message
        });

        res.status(200).json({ success: true, message: 'Verification email sent' });
    } catch (err) {
        console.error('Error sending verification email:', err);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

app.post('/api/verify-code', async (req, res) => {
    const { email, code, user } = req.body;
    currentTime = new Date();

    try {
        const [rows] = await pool.promise().query( // Find the matching row
            'SELECT * FROM verifications WHERE email = ? AND code = ? AND expires_at > ?',
            [email, code, currentTime]);

        if (rows.length > 0) { // If a row matches, update the user's verification status in memory and database
            if (user === 'admin') {
                const admin = admins.find(admin => admin.email === email);
                if (admin) {
                    admin.setVerified();
                    await pool.promise().query('UPDATE administrators SET verified = 1 WHERE email = ?', [email]); 
                }
            } else if (user === 'agent') { 
                const agent = agents.find(agent => agent.email === email);
                if (agent) {
                    agent.setVerified();
                    await pool.promise().query('UPDATE agents SET verified = 1 WHERE email = ?',
                        [email]); 
                }
            }
            res.status(200).json({ success: true, message: 'Verification successful' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
        }
    } catch (err) {
        console.error('Error verifying code:', err);
        res.status(500).json({ success: false, error: 'Failed to verify code' });
    }
});

app.post('/api/unverify-user', async (req, res) => {
    const { role, userId } = req.body; // Get user type and ID
    try { // Unverify user in memory and database
        if (role === 'admin') {
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                admin.setUnverified();
                await pool.promise().query('UPDATE administrators SET verified = 0 WHERE admin_id = ?', [userId]);
            }
        } else if (role === 'agent') {  
            const agent = agents.find(agent => agent.agentID === userId);
            if (agent) {
                agent.setUnverified();
                await pool.promise().query('UPDATE agents SET verified = 0 WHERE agent_id = ?', [userId]);
            }
        }
        res.status(200).json({ success: true, message: 'User unverified successfully' });
    } catch {
        console.error('Error unverifying user:', err);
        res.status(500).json({ success: false, error: 'Failed to unverify user' });
    }
});

// Return all users
app.post('/api/get-users', async (req, res) => {
    const { role } = req.body; 
    const users = [];
    try { // Return all users depending on role
        if (role === 'admin') {
            admins.forEach(admin => {
                users.push({
                    adminID: admin.adminID,
                    forename: admin.forename,
                    surname: admin.surname,
                    email: admin.email,
                    phone: admin.phone,
                });
            });
        } else if (role === 'agent') {
            agents.forEach(agent => {
                users.push({
                    agentID: agent.agentID,
                    username: agent.username,
                    email: agent.email,
                });
            });
        }
        res.status(200).json({ users });
    } catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


// Delete user from database and memory
app.post('/api/delete-user', async (req, res) => {
    const { role, userId } = req.body;
    try {
        if (role === 'admin') {
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                if (req.session.user.adminID === userId) { // Prevent user from deleting their own account while logged in
                    return res.status(400).json({ error: 'Cannot delete currently logged in user' });
                }
                admins.splice(admins.indexOf(admin), 1);
                await pool.promise().query('DELETE FROM administrators WHERE admin_id = ?', [userId]);
            }
        } else if (role === 'agent') {
            const agent = agents.find(agent => agent.agentID === userId);
            if (agent) {
                if (req.session.user.agentID === userId) { // Prevent user from deleting their own account while logged in
                    return res.status(400).json({ error: 'Cannot delete currently logged in user' });
                }
                agent.splice(agents.indexOf(agent), 1);
                await pool.promise().query('DELETE FROM agents WHERE agent_id = ?', [userId]);
            }
        }
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch(err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user' });
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

function validateUsername(username) {
    const regex = /^[A-Za-z0-9_]{6,20}$/; 
    if (!regex.test(username)) {
        return { 
            isValid: false,
            error: "Invalid username. Please enter a username between 6 and 20 characters, containing only letters, numbers and underscores."
        };
    }
    return { isValid: true, value: username };
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
            errors.push('Email address already registered');
            return res.status(400).json({ success: false, errors });
        }

        const [rowsPhone] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM administrators WHERE phone = ?',
            [validatedPhone.value] // Check if phone number exists in database
        );
        if (rowsPhone[0].count > 0) {
            errors.push('Phone number already registered');
            return res.status(400).json({ success: false, errors });
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

// Authenticate users
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);
    const errors = [];
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        if (role === 'admin') {
            const [rowsEmail] = await pool.promise().query(
                'SELECT COUNT(*) as count FROM administrators WHERE email = ?',
                [validatedEmail.value] // Check if email address exists in database
            );
            if (rowsEmail[0].count === 0) {
                errors.push('Incorrect email address');
                return res.status(400).json({ success: false, errors });
            } else if (rowsEmail[0].count > 0) { // Find admin instance with matching email and compare passwords
                const admin = admins.find(admin => admin.email === email);
                const passwordMatch = await bcrypt.compare(validatedPassword.value, admin.hashedPassword);

                if (!passwordMatch) { 
                    errors.push('Incorrect password');
                    return res.status(400).json({ success: false, errors });
                } else { // Check if admin is verified
                    if (admin.verified) {
                        req.session.user = { email: validatedEmail.value, adminID: admin.adminID }; // Create session for user
                        return res.status(200).json({ success: true });
                    } else {
                    return res.status(400).json({ success: false, message: 'Unverified' });
                    }
                }
            }
        } else if (role === 'agent') {
            const [rowsEmail] = await pool.promise().query(
                'SELECT COUNT(*) as count FROM agents WHERE email = ?',
                [validatedEmail.value] // Check if email address exists in database
            );
            if (rowsEmail[0].count === 0) {
                errors.push('Incorrect email address');
                return res.status(400).json({ success: false, errors });
            } else if (rowsEmail[0].count > 0) { // Find agent instance with matching email and compare passwords
                const agent = agents.find(agent => agent.email === email);
                const passwordMatch = await bcrypt.compare(validatedPassword.value, agent.hashedPassword);

                if (!passwordMatch) { 
                    errors.push('Incorrect password');
                    return res.status(400).json({ success: false, errors });
                } else { // Check if agent is verified
                    if (agent.verified) {
                        req.session.user = { email: validatedEmail.value, agentID: agent.agentID }; // Create session for user
                        return res.status(200).json({ success: true });
                    } else {
                        return res.status(400).json({ success: false, message: 'Unverified' });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error authenticating user:', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to log in'] 
        });
    }
});  

// Create agent account
app.post('/api/create-agent', async (req, res) => {
    const { username, email, accessLevel, workingHours, password, specialties } = req.body;
    const validatedUsername = validateUsername(username);
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);
    
    // Push validation error messages to array
    const errors = [];
    if (!validatedUsername.isValid) errors.push(validatedUsername.error);
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const [rowsUsername] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM agents WHERE username = ?',
            [validatedUsername.value] // Check if username exists in database
        );
        if (rowsUsername[0].count > 0) {
            errors.push('Username taken');
            return res.status(400).json({ success: false, errors });
        }

        const [rowsEmail] = await pool.promise().query(
            'SELECT COUNT(*) as count FROM agents WHERE email = ?',
            [validatedEmail.value] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            errors.push('Email address already registered');
            return res.status(400).json({ success: false, errors });
        }

        // Encrypt password using hashing algorithm, then insert agent details into database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        const query = 'INSERT INTO agents (username, email, access_level, working_hours, hashed_password, specialty) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [
            validatedUsername.value,
            validatedEmail.value,
            accessLevel,
            JSON.stringify(workingHours), // Store working hours as a JSON string
            hashedPassword,
            JSON.stringify(specialties), // Store specialties as a JSON string
        ];
        const [results] = await pool.promise().query(query, values);
        
        // Create new agent instance and add agentID from database
        const newAgent = new Agent(
            validatedUsername.value,
            validatedEmail.value,
            accessLevel,
            workingHours,
            hashedPassword
        );
        newAgent.setAgentID(results.insertId);
        newAgent.setSpecialties(specialties);
        agents.push(newAgent);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error creating agent: ', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to create agent account'] 
        });
    }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
    const { email, password, type } = req.body;
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);
    const errors = [];
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    if (type === 'login') {
        currentTime = new Date();
        const [rows] = await pool.promise().query( // Find the matching row
            'SELECT * FROM verifications WHERE email = ? AND type = ? AND expires_at > ?',
            [email, 'password', currentTime]);

        if (rows[0].count === 0) {
            errors.push('Verification expired or invalid');
            return res.status(400).json({ success: false, errors });
        }
    }

    try { // Update password in database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
            await pool.promise().query(
                'UPDATE administrators SET hashed_password = ? WHERE email = ?',
                [hashedPassword, validatedEmail.value] 
            );
        const admin = admins.find(admin => admin.email === email);
        admin.setPassword(hashedPassword);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to reset password'] 
        });
    }
});

// Update forename
app.post('/api/update-forename', async (req, res) => {
    const { forename, userId = req.session.user.adminID } = req.body;

    try { // Update forename in database
        await pool.promise().query('UPDATE administrators SET forename = ? WHERE admin_id = ?', [forename, userId]);
        const admin = admins.find(admin => admin.adminID === userId);
        if (admin) {
            admin.forename = forename; // Update the in-memory admin's forename
        }
        res.status(200).json({ success: true, message: 'Forename updated successfully' });
    } catch (error) {
        console.error('Error updating forename:', error);
        res.status(500).json({ success: false, message: 'Failed to update forename' });
    }
});

// Update surname
app.post('/api/update-surname', async (req, res) => {
    const { surname, userId = req.session.user.adminID } = req.body;

    try { // Update surname in database
        await pool.promise().query('UPDATE administrators SET surname = ? WHERE admin_id = ?', [surname, userId]);
        const admin = admins.find(admin => admin.adminID === userId);
        if (admin) {
            admin.surname = surname; // Update the in-memory admin's surname
        }
        res.status(200).json({ success: true, message: 'Surname updated successfully' });
    } catch (error) {
        console.error('Error updating surname:', error);
        res.status(500).json({ success: false, message: 'Failed to update surname' });
    }
});

// Update email address
app.post('/api/update-email', async (req, res) => {
    const { email, role, userId = 0} = req.body;
    const validatedEmail = validateEmail(email);
    const errors = [];
    let table;

    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    if (role === 'admin') {
        if (userId === 0) {
            userId = req.session.user.adminID;
        } 
        table = 'administrators';
    } else if (role === 'agent') {
        if (userId === 0) {
            userId = req.session.user.agentID;
        }
        table = 'agents';
    }

    const [rowsEmail] = await pool.promise().query(
        'SELECT COUNT(*) as count FROM ?? WHERE email = ?',
        [table, validatedEmail.value] // Check if email address exists in database
    );
    if (rowsEmail[0].count > 0) {
        errors.push('Email address already registered');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update email address in database
        if (role === 'admin') {
            await pool.promise().query('UPDATE administrators SET email = ? WHERE admin_id = ?', [email, userId]);
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                admin.email = email; // Update the in-memory admin's email address
            }
        } else if (role === 'agent') {
            await pool.promise().query('UPDATE agents SET email = ? WHERE agent_id = ?', [email, userId]);
            const agent = agents.find(agent => agent.agentID === userId);
            if (agent) {
                agent.email = email; // Update the in-memory agent's email address
            }
        }
        res.status(200).json({ success: true, message: 'Email address updated successfully' });
    } catch (error) {
        console.error('Error updating email:', error);
        res.status(500).json({ success: false, message: 'Failed to update email' });
    }
});

// Update phone number
app.post('/api/update-phone', async (req, res) => {
    const { phone, userId = req.session.user.adminID } = req.body;
    const validatedPhone = validatePhone(phone);
    const errors = [];

    if (!validatedPhone.isValid) errors.push(validatedPhone.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    const [rowsPhone] = await pool.promise().query(
        'SELECT COUNT(*) as count FROM administrators WHERE phone = ?',
        [validatedPhone.value] // Check if phone number exists in database
    );
    if (rowsPhone[0].count > 0) {
        errors.push('Phone number already registered');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update phone number in database
        await pool.promise().query('UPDATE administrators SET phone = ? WHERE admin_id = ?', [phone, userId]);
        const admin = admins.find(admin => admin.adminID === userId);
        if (admin) {
            admin.phone = phone; // Update the in-memory admin's phone number
        }
        res.status(200).json({ success: true, message: 'Phone number updated successfully' });
    } catch (error) {
        console.error('Error updating phone number:', error);
        res.status(500).json({ success: false, message: 'Failed to update phone number' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    try { // Load administrators from database into memory
        const [rows] = await pool.promise().query('SELECT * FROM administrators ORDER BY admin_id ASC');
        rows.forEach(row => {
            const admin = new Administrator(
                row.forename, row.surname, row.email, row.phone, row.hashed_password);
            if (row.verified === 1) {
                admin.setVerified();
            }
            admin.setAdminID(row.admin_id);
            admins.push(admin);
        });
        console.log(`Loaded ${admins.length} administrators into memory.`);
    } catch (err) {
        console.error('Error loading admins from database:', err);
    }

    try { // Load agents from database into memory
        const [rows] = await pool.promise().query('SELECT * FROM agents ORDER BY agent_id ASC');
        rows.forEach(row => {
            const agent = new Agent(
                row.username, row.email, row.access_level, JSON.parse(row.working_hours), row.hashed_password);
            if (row.verified === 1) {
                agent.setVerified();
            }
            agent.setAgentID(row.agent_id);
            if (row.specialty) {
                agent.setSpecialties(JSON.parse(row.specialty));
            }
            agents.push(agent);
        });
        console.log(`Loaded ${agents.length} agents into memory.`);
    } catch (err) {
        console.error('Error loading agents from database:', err);
    }

});

// Close database connection
process.on('SIGINT', () => {
    pool.end();
    console.log('Database connection closed');
    process.exit();
});