const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Administrator = require('./public/models/administrator');
const Agent = require('./public/models/agent');
const Task = require('./public/models/task');
const Customer = require('./public/models/customer');
const Ticket = require('./public/models/ticket');
const {
    validateName,
    validateUsername,
    validateEmail,
    validatePhone,
    validatePassword,
    validateTitle,
    validateDesc,
    validateDeadline
} = require('./utils/validation');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
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
const tasks = [];
const customers = [];
const tickets = [];

// Check if admin is authenticated
function isAuthenticatedAdmin(req, res, next) { // Check if session exists and user is logged in as an admin
    if (req.session && req.session.user && req.session.user.adminID) { 
        return next();
    } else { // Redirect to startup page if user is not authenticated
        res.redirect('public/index.html');
    }
}

// Check if agent is authenticated
function isAuthenticatedAgent(req, res, next) { // Check if session exists and user is logged in as an agent
    if (req.session && req.session.user && req.session.user.agentID) { 
        return next();
    } else { // Redirect to startup page if user is not authenticated
        res.redirect('public/index.html');
    }
}

app.get('/', (req, res) => {
    res.redirect('/index.html'); 
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

app.get('/managetask.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'managetask.html'));
});

app.get('/createtask.html', isAuthenticatedAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createtask.html'));
});

app.get('/agentscreen.html', isAuthenticatedAgent, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agentscreen.html'));
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

// Notify admins of multiple failed login attempts
app.post('/api/notify-admin', async (req, res) => {
    const { email } = req.body;
    try {
        for (const admin of admins) { // Send email to each admin
            await transporter.sendMail({
                from: `Brace for Techmedic <${process.env.EMAIL_ADDRESS}>`,
                to: admin.email,
                subject: 'Brace: Multiple failed login attempts',
                text: `Multiple failed login attempts for user with email address: ${email}`
            });
        }
        res.status(200).json({ success: true, message: 'Admin notified successfully' });
    } catch (err) {
        console.error('Error notifying admin:', err);
        res.status(500).json({ success: false, error: 'Failed to notify admin' });
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
                    await pool.promise().query('UPDATE agents SET verified = 1 WHERE email = ?', [email]); 
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
                    accessLevel: agent.accessLevel,
                    workingHours: agent.workingHours,
                    specialties: agent.specialties,
                    availability: agent.availability
                });
            });
        }
        res.status(200).json({ users });
    } catch {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Return all tasks
app.post('/api/get-tasks', async (req, res) => {
    const taskArr = [];
    try {
        tasks.forEach(task => {
            const assignedAgents = [];
            task.assignedTo.forEach(agentID => { // Add each agent's username to array
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    assignedAgents.push(agent.username);
                }
            });

            const creator = admins.find(admin => admin.adminID === task.creator);
            const creatorName = creator.forename + ' ' + creator.surname;

            taskArr.push({ // Return all relevant task details
                taskID: task.taskID,
                status: task.status,
                title: task.title,
                desc: task.desc,
                deadline: task.deadline,
                assignedTo: assignedAgents.join(', '),
                creationDate: task.creationDate,
                creator: creatorName
            });
        });
        res.status(200).json({ taskArr });
    } catch {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Return a user's tasks
app.post('/api/get-user-tasks', async (req, res) => {
    const userTasks = [];
    const agentID = req.session.user.agentID;
    try {
        const agent = agents.find(agent => agent.agentID === agentID);
        if (agent) {
            agent.tasks.forEach(taskID => {
                const task = tasks.find(task => task.taskID === taskID);
                if (task) {
                    const creator = admins.find(admin => admin.adminID === task.creator);
                    const creatorName = creator.forename + ' ' + creator.surname;
                    userTasks.push({ // Return all relevant task details
                        taskID: task.taskID,
                        status: task.status,
                        title: task.title,
                        desc: task.desc,
                        deadline: task.deadline,
                        creationDate: task.creationDate,
                        creator: creatorName
                    });
                }
            });
            res.status(200).json({ userTasks });
        }
    } catch {
        res.status(500).json({ error: 'Failed to fetch user tasks' });
    }
});

// Return all tickets and relevant information about the associated customers
app.post('/api/get-tickets', async (req, res) => {
    const ticketArr = [];
    const user = req.session.user;

    try {
        tickets.forEach(ticket => { 
            if (user && user.agentID) { // If requestor is an agent, check access level
                const agent = agents.find(agent => agent.agentID === user.agentID);
                if ((agent && Number(agent.accessLevel) == 1) && ticket.triaged === true) {
                    return; // Level 1 agents cannot view triaged tickets
                }
            }

            const customer = customers.find(customer => customer.customerID === ticket.creator);
            if (customer) {
                ticketArr.push({
                    ticketID: ticket.ticketID,
                    status: ticket.status,
                    title: ticket.title,
                    desc: ticket.desc,
                    type: ticket.type,
                    deadline: ticket.deadline,
                    creationDate: ticket.creationDate,
                    priority: ticket.priority,
                    triage: ticket.triaged,
                    customerID: customer.customerID,
                    customerUsername: customer.username,
                    customerEmail: customer.email
                });
            }
        });
        res.status(200).json({ ticketArr });
    } catch {
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Check if a user is assigned to a ticket
app.post('/api/check-assign', async (req, res) => {
    const user = req.session.user;
    const assignedTickets = [];

    if (user && user.agentID) {
        try { // Check if agent has assigned ticket
            const agent = agents.find(agent => agent.agentID === user.agentID);
            if (agent && agent.ticket) {
                assignedTickets.push(agent.ticket);
            }
            res.status(200).json({ userTickets: assignedTickets });
        } catch (error) {
            console.error('Error checking assigned tickets:', error);
            res.status(500).json({ error: 'Failed to check assigned tickets' });
        }
    } else if (user && user.adminID) {
        try { // Check if admin has assigned ticket
            const admin = admins.find(admin => admin.adminID === user.adminID);
            if (admin && admin.ticket) {
                assignedTickets.push(admin.ticket);
            }
            res.status(200).json({ userTickets: assignedTickets });
        } catch (error) {
            console.error('Error checking assigned tickets:', error);
            res.status(500).json({ error: 'Failed to check assigned tickets' });
        }
    } else {
        res.status(400).json({ error: 'User unauthenticated or unauthorised' });
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

// Delete task from database and memory
app.post('/api/delete-task', async (req, res) => {
    const { taskId } = req.body;
    try {
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            tasks.splice(tasks.indexOf(task), 1);
            await pool.promise().query('DELETE FROM tasks WHERE task_id = ?', [taskId]);

            task.assignedTo.forEach(async (agentID) => { // Remove task from each assigned agent's tasks array
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.removeTask(task.taskID);
                    await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
                }
            });
        }
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
});

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

// Create task
app.post('/api/create-task', async (req, res) => {
    const { title, desc, deadline, assignedTo } = req.body;
    const validatedTitle = validateTitle(title);
    const validatedDesc = validateDesc(desc);
    const validatedDeadline = validateDeadline(deadline);
    const errors = [];
    const creationDate = new Date();
    const creator = req.session.user.adminID;
    const completionStatus = {};
    assignedTo.forEach(agentID => {
        completionStatus[agentID] = false;
    });

    if (!validatedTitle.isValid) errors.push(validatedTitle.error);
    if (!validatedDesc.isValid) errors.push(validatedDesc.error);
    if (!validatedDeadline.isValid) errors.push(validatedDeadline.error);
    if (!assignedTo) errors.push('Task must be assigned to at least one agent')
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const query = 'INSERT INTO tasks (title, description, deadline, assigned_to, created_at, created_by, completion_status) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [
            validatedTitle.value,
            validatedDesc.value,
            validatedDeadline.value,
            JSON.stringify(assignedTo),
            creationDate,
            creator,
            JSON.stringify(completionStatus)
        ];
        const [results] = await pool.promise().query(query, values);

        const newTask = new Task( // Create new task instance and add taskID from database
            validatedTitle.value,
            validatedDesc.value,
            creator,
            validatedDeadline.value,
            assignedTo,
            creationDate
        );
        newTask.taskID = results.insertId;
        tasks.push(newTask);

        assignedTo.forEach(async (agentID) => { // Add task to each assigned agent
            const agent = agents.find(agent => agent.agentID === Number(agentID));
            if (agent) {
                agent.addTask(newTask.taskID);
                await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
            }
        });
        res.status(200).json({ success: true, task: newTask });
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ success: false, errors: ['Failed to create task'] });
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

// Update username
app.post('/api/update-username', async (req, res) => {
    const { username, userId } = req.body;
    const validatedUsername = validateUsername(username);
    const errors = [];

    if (!validatedUsername.isValid) errors.push(validatedUsername.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    const [rowsUsername] = await pool.promise().query(
        'SELECT COUNT(*) as count FROM agents WHERE username = ?',
        [validatedUsername.value] // Check if username exists in database
    );
    if (rowsUsername[0].count > 0) {
        errors.push('Username taken');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update username in database
        await pool.promise().query('UPDATE agents SET username = ? WHERE agent_id = ?', [username, userId]);
        const agent = agents.find(agent => agent.agentID === userId);
        if (agent) {
            agent.username = username; // Update the in-memory agent's username
        }
        res.status(200).json({ success: true, message: 'Username updated successfully' });
    } catch (error) {
        console.error('Error updating username:', error);
        res.status(500).json({ success: false, message: 'Failed to update username' });
    }
});

// Update access level
app.post('/api/update-access', async (req, res) => {
    const { accessLevel, userId } = req.body;
    try { // Update access level in database
        await pool.promise().query('UPDATE agents SET access_level = ? WHERE agent_id = ?', [accessLevel, userId]);
        const agent = agents.find(agent => agent.agentID === userId);
        if (agent) {
            agent.setAccessLevel(accessLevel); // Update the in-memory agent's access level
        }
        res.status(200).json({ success: true, message: 'Access level updated successfully' });
    } catch (error) {
        console.error('Error updating access level:', error);
        res.status(500).json({ success: false, message: 'Failed to update access level' });
    }
});

// Update working hours
app.post('/api/update-hours', async (req, res) => {
    const { workingHours, userId } = req.body;

    try { // Update working hours in database
        await pool.promise().query('UPDATE agents SET working_hours = ? WHERE agent_id = ?', [JSON.stringify(workingHours), userId]);
        const agent = agents.find(agent => agent.agentID === userId);
        if (agent) {
            agent.setWorkingHours(workingHours); // Update the in-memory agent's working hours
        }
        res.status(200).json({ success: true, message: 'Working hours updated successfully' });
    } catch (error) {
        console.error('Error updating working hours:', error);
        res.status(500).json({ success: false, message: 'Failed to update working hours' });
    }
});

// Update specialties
app.post('/api/update-specialties', async (req, res) => {
    const { specialties, userId } = req.body;

    try { // Update specialties in database
        await pool.promise().query('UPDATE agents SET specialty = ? WHERE agent_id = ?', [JSON.stringify(specialties), userId]);
        const agent = agents.find(agent => agent.agentID === userId);
        if (agent) {
            agent.setSpecialties(specialties); // Update the in-memory agent's specialties
        }
        res.status(200).json({ success: true, message: 'Specialties updated successfully' });
    } catch (error) {
        console.error('Error updating specialties:', error);
        res.status(500).json({ success: false, message: 'Failed to update specialties' });
    }
});

// Update password
app.post('/api/update-password', async (req, res) => {
    const { password, userId } = req.body;
    const validatedPassword = validatePassword(password);
    const errors = [];

    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update password in database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        await pool.promise().query('UPDATE agents SET hashed_password = ? WHERE agent_id = ?', [hashedPassword, userId]);
        const agent = agents.find(agent => agent.agentID === userId);
        if (agent) {
            agent.setPassword(hashedPassword); // Update the in-memory agent's password
        }
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

// Update a task's title
app.post('/api/update-title', async (req, res) => {
    const { title, taskId } = req.body;
    const validatedTitle = validateTitle(title);
    const errors = [];

    if (!validatedTitle.isValid) errors.push(validatedTitle.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update title in database
        await pool.promise().query('UPDATE tasks SET title = ? WHERE task_id = ?', [validatedTitle.value, taskId]);
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.title = validatedTitle.value; // Update the in-memory task's title
        }
        res.status(200).json({ success: true, message: 'Title updated successfully' });
    } catch (error) {
        console.error('Error updating title:', error);
        res.status(500).json({ success: false, message: 'Failed to update title' });
    }
});

// Update a task's description
app.post('/api/update-desc', async (req, res) => {
    const { desc, taskId } = req.body;
    const validatedDesc = validateDesc(desc);
    const errors = [];

    if (!validatedDesc.isValid) errors.push(validatedDesc.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update description in the database
        await pool.promise().query('UPDATE tasks SET description = ? WHERE task_id = ?', [validatedDesc.value, taskId]);
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.desc = validatedDesc.value; // Update the in-memory task's description
        }
        res.status(200).json({ success: true, message: 'Description updated successfully' });
    } catch (error) {
        console.error('Error updating description:', error);
        res.status(500).json({ success: false, message: 'Failed to update description' });
    }
});

// Update a task's deadline
app.post('/api/update-deadline', async (req, res) => {
    const { deadline, taskId } = req.body;
    const validatedDeadline = validateDeadline(deadline);
    const errors = [];

    if (!validatedDeadline.isValid) errors.push(validatedDeadline.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update deadline in database
        await pool.promise().query('UPDATE tasks SET deadline = ? WHERE task_id = ?', [validatedDeadline.value, taskId]);
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.deadline = validatedDeadline.value; // Update the in-memory task's deadline
        }
        res.status(200).json({ success: true, message: 'Deadline updated successfully' });
    } catch (error) {
        console.error('Error updating deadline:', error);
        res.status(500).json({ success: false, message: 'Failed to update deadline' });
    }
});

// Update a task's assignments
app.post('/api/update-assign', async (req, res) => {
    const { assignedTo, taskId } = req.body;
    const errors = [];
    if (!assignedTo) errors.push('Task must be assigned to at least one agent');
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update assignments in database
        const completionStatus = {};
        assignedTo.forEach(agentID => {
            completionStatus[agentID] = false;
        });

        await pool.promise().query('UPDATE tasks SET assigned_to = ?, completion_status = ? WHERE task_id = ?', [JSON.stringify(assignedTo), JSON.stringify(completionStatus), taskId]);
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.assignedTo.forEach(async (agentID) => { // Remove task from previously assigned agents
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.removeTask(task.taskID);
                    await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
                }
            });

            task.assignedTo = assignedTo; // Update the in-memory task's assigned agents
            task.completionStatus = completionStatus; 
            assignedTo.forEach(async (agentID) => { // Add task to newly assigned agents
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.addTask(task.taskID);
                    await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
                }
            });
        }
        res.status(200).json({ success: true, message: 'Task assignment updated successfully' });
    } catch (error) {
        console.error('Error updating task assignment:', error);
        res.status(500).json({ success: false, message: 'Failed to update task assignment' });
    }
});

// Update break duration
app.post('/api/update-duration', async (req, res) => {
    const { duration } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM config WHERE setting_name = "break_duration"');
        if (rows.length > 0) {
            await pool.promise().query('UPDATE config SET setting_value = ? WHERE setting_name = "break_duration"', [duration]);
        } else {
            await pool.promise().query('INSERT INTO config (setting_name, setting_value) VALUES (?, ?)', ['break_duration', duration]);
        }
        res.status(200).json({ success: true, message: 'Break duration updated successfully' });
    } catch (error) {
        console.error('Error updating break duration:', error);
        res.status(500).json({ success: false, message: 'Failed to update break duration' });
    }
});

// Update break frequency
app.post('/api/update-frequency', async (req, res) => {
    const { frequency } = req.body;
    try {
        const [rows] = await pool.promise().query('SELECT * FROM config WHERE setting_name = "break_frequency"');
        if (rows.length > 0) {
            await pool.promise().query('UPDATE config SET setting_value = ? WHERE setting_name = "break_frequency"', [frequency]);
        } else {
            await pool.promise().query('INSERT INTO config (setting_name, setting_value) VALUES (?, ?)', ['break_frequency', frequency]);
        }
        res.status(200).json({ success: true, message: 'Break frequency updated successfully' });
    } catch (error) {
        console.error('Error updating break frequency:', error);
        res.status(500).json({ success: false, message: 'Failed to update break frequency' });
    }
});

// Complete task
app.post('/api/complete-task', async (req, res) => {
    const { taskId } = req.body;
    const agentId = req.session.user.agentID;
    try {
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.setComplete(agentId); // Update agent's completion status
            await pool.promise().query('UPDATE tasks SET completion_status = ? WHERE task_id = ?', [JSON.stringify(task.completionStatus), taskId]);
            if (task.status === 'Completed') {
                await pool.promise().query('UPDATE tasks SET status = ? WHERE task_id = ?', ['Completed', taskId]);
            }
        }
        const agent = agents.find(agent => agent.agentID === Number(agentId));
        const assignedToArray = JSON.parse(task.assignedTo);
        if (assignedToArray.includes(agentId)) { // Remove task from agent's tasks array
            agent.removeTask(task.taskID);
            await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentId]);
        }
        res.status(200).json({ success: true, message: 'Task completed successfully' });
    } catch (err) {
        console.error('Error completing task:', err);
        res.status(500).json({ success: false, message: 'Failed to complete task' });
    }
});

// Self-assign ticket
app.post('/api/assign-ticket', async (req, res) => {
    const { ticketId } = req.body;
    const agentId = req.session.user.agentID;
    try {
        const ticket = tickets.find(ticket => ticket.ticketID === ticketId);
        if (ticket.status === 'Unassigned') { // Update ticket status in memory and database
            ticket.setStatus('Assigned');
            await pool.promise().query('UPDATE tickets SET status = ? WHERE ticket_id = ?', ['Assigned', ticketId]);
            ticket.assignTo(agentId);
            await pool.promise().query('UPDATE tickets SET assigned_to = ? WHERE ticket_id = ?', [agentId, ticketId]);
        } else {
            return res.status(400).json({ success: false, message: 'Ticket already assigned' });
        }

        const agent = agents.find(agent => agent.agentID === Number(agentId));
        if (agent && !agent.ticket) {
            agent.assignTicket(ticketId); // Add ticket to agent
            agent.setAvailability('Unavailable'); // Set agent to unavailable
            await pool.promise().query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(agent.ticket), agentId]);
        } else {
            return res.status(400).json({ success: false, message: 'Agent already assigned to a ticket' });
        }
        res.status(200).json({ success: true, message: 'Ticket assigned successfully' });
    } catch (err) {
        console.error('Error assigning ticket:', err);
        res.status(500).json({ success: false, message: 'Failed to assign ticket' });
    }
});

// Start break
app.post('/api/start-break', async (req, res) => {
    const agentId = req.session.user.agentID;
    const currentTime = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()];
    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
    const currentDate = currentTime.toISOString().split('T')[0];
    

    try { // Check break configuration
        const agent = agents.find(agent => agent.agentID === agentId);
        if (!agent) {
            return res.status(400).json({ success: false, message: 'Agent not found' });
        }
        const workingHours = agent.workingHours[currentDay];
        if (!workingHours) {
            return res.status(400).json({ success: false, message: 'Agent is not within working hours, cannot start break' });
        }

        const [startH, startM] = workingHours.start.split(':').map(Number);
        const [endH, endM] = workingHours.end.split(':').map(Number);
        const start = (startH * 60) + startM;
        const end = (endH * 60) + endM;

        let isWorking = false; // Check if agent is within working hours
        if (end < start) { // Check if working hours span across two days
            isWorking = (currentMinutes >= start) || (currentMinutes < end);
        } else {
            isWorking = (currentMinutes >= start) && (currentMinutes < end);
        }
        if (!isWorking) {
            return res.status(400).json({ success: false, message: 'Agent is not within working hours, cannot start break' });
        }

        // Delete previous working day break entries
        await pool.promise().query('DELETE FROM breaks WHERE agent_id = ? AND break_date < ?', [agentId, currentDate]);
        const [durationRows] = await pool.promise().query('SELECT setting_value FROM config WHERE setting_name = "break_duration"');
        const [frequencyRows] = await pool.promise().query('SELECT setting_value FROM config WHERE setting_name = "break_frequency"');
        const breakDuration = Number(durationRows[0].setting_value);
        const breakFrequency = Number(frequencyRows[0].setting_value);

        // Check if the agent has taken all breaks for the day or if there is an ongoing break
        const [breakRows] = await pool.promise().query('SELECT * FROM breaks WHERE agent_id = ? AND break_date = ?', [agentId, currentDate]);
        if (breakRows.length >= breakFrequency) {
            return res.status(400).json({ success: false, message: 'User has already taken all breaks for current day' });
        }
        const ongoingBreak = breakRows.find(breakRow => {
            const breakEnd = new Date(breakRow.break_start).getTime() + (breakDuration * 60 * 1000);
            return currentTime.getTime() < breakEnd;
        });
        if (ongoingBreak) {
            const breakStart = new Date(ongoingBreak.break_start).toLocaleTimeString();
            return res.status(200).json({ success: false, message: `Break already in progress for ${breakDuration} minutes, from ${breakStart}` });
        }
        
        if (breakRows.length > 0) { 
            await pool.promise().query('UPDATE breaks SET break_number = ?, break_start = ? WHERE agent_id = ? AND break_date = ?', [breakRows[0].break_number + 1, currentTime, agentId, currentDate]);
            agent.setAvailability('Unavailable');
        } else if (breakRows.length === 0) { 
            agent.setAvailability('Unavailable');
            await pool.promise().query('INSERT INTO breaks (agent_id, break_start, break_date, break_number) VALUES (?, ?, ?, ?)', [agentId, currentTime, currentDate, 1]);
        }
        res.status(200).json({ success: true, message: `Break started for ${breakDuration} minutes`, breakDuration });
    } catch (error) {
        console.error('Error starting break:', error);
        res.status(500).json({ success: false, message: 'Failed to start break' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    let firstLoad = null;
    
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

    try { // Load tasks from database into memory
        const [rows] = await pool.promise().query('SELECT * FROM tasks ORDER BY task_id ASC');
        rows.forEach(row => {
            const task = new Task(
                row.title, row.description, row.created_by, row.deadline, JSON.parse(row.assigned_to), row.created_at);
            task.setTaskID(row.task_id);
            task.setStatus(row.status);
            task.completionStatus = JSON.parse(row.completion_status); 
            tasks.push(task);

            const assignedTo = JSON.parse(row.assigned_to);
            assignedTo.forEach(agentID => { // Add task to each assigned agent
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent && task.completionStatus[agentID] === false) {
                    agent.addTask(task.taskID);
                }
            });
        });
        console.log(`Loaded ${tasks.length} tasks into memory.`);
    } catch (err) {
        console.error('Error loading tasks from database:', err);
    }

    setInterval(async () => { // Execute every minute to sync with database and customer-facing website
        try { // Set availability for each agent based on working hours
            const currentTime = new Date();
            const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentTime.getDay()];
            const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
            const currentDate = currentTime.toISOString().split('T')[0];

        
            agents.forEach(async agent => {
                const workingHours = agent.workingHours[currentDay];
                let available = false;
                
                if (workingHours && !agent.ticket) { // Check if agent is available based on working hours and assignment
                    const [startH, startM] = workingHours.start.split(':').map(Number);
                    const [endH, endM] = workingHours.end.split(':').map(Number);
                    const start = (startH * 60) + startM;
                    const end = (endH * 60) + endM;
        
                    if (end < start) { // Check if working hours span across two days
                        available = (currentMinutes >= start) || (currentMinutes < end);
                    } else {
                        available = (currentMinutes >= start) && (currentMinutes < end);
                    }

                    if (available) { // Check if the agent is currently on a break
                        const [breakRows] = await pool.promise().query('SELECT * FROM breaks WHERE agent_id = ? AND break_date = ?', [agent.agentID, currentDate]);
                        const ongoingBreak = breakRows.find(breakRow => {
                            const breakDuration = Number(breakRow.break_duration);
                            const breakEndTime = new Date(breakRow.break_start).getTime() + (breakDuration * 60 * 1000);
                            return currentTime.getTime() < breakEndTime;
                        });
                        if (ongoingBreak) { // Set agents on break to unavailable
                            available = false; 
                        }
                    }
                }
                agent.setAvailability(available ? 'Available' : 'Unavailable');
            });
        } catch (err) {
            console.error('Error setting availability:', err);
        }

        try { // Load customers and tickets from database into memory
            const [customerRows] = await pool.promise().query('SELECT * FROM customers ORDER BY customer_id ASC');
            const [ticketRows] = await pool.promise().query('SELECT * FROM tickets ORDER BY ticket_id ASC');
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            for (const row of customerRows) {
                if (new Date(row.registered_at) < weekAgo) {
                    const [ticketCount] = await pool.promise().query('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [row.customer_id]);
                    if (ticketCount[0].count === 0) {
                        continue; // Skip adding customer to in-memory array
                    }
                }

                if (!customers.find(customer => customer.customerID === row.customer_id)) { // Only add new customers to in-memory array
                    const customer = new Customer(row.username, row.email, row.registered_at);
                    customer.setCustomerID(row.customer_id);
                    customers.push(customer);
                    console.log(`Loaded ${customers.length} customers into memory.`);
                }
            }

            for (const row of ticketRows) {
                if (row.status === 'Completed') {
                    continue; // Skip adding completed ticket to in-memory array
                }

                if (!tickets.find(ticket => ticket.ticketID === row.ticket_id)) { // Only add new tickets to in-memory array
                    const ticket = new Ticket(row.title, row.description, row.created_by, row.type, row.created_at);
                    ticket.setTicketID(row.ticket_id);
                    tickets.push(ticket);
                    console.log(`Loaded ${tickets.length} tickets into memory.`);

                    if (row.triage) { // Triage in-memory ticket if ticket in database triaged
                        ticket.triage();
                    }
                    if (row.priority_level > 1) { // Set correct priority for in-memory ticket based on priority of ticket in database 
                        ticket.setPriority(row.priority_level);
                    }
                    if (row && row.assigned_to) { // Assign ticket to agent in memory if ticket in database is assigned
                        const agent = agents.find(agent => agent.agentID === row.assigned_to);
                        if (agent) {
                            agent.assignTicket(ticket.ticketID);
                            ticket.assignTo(agent.agentID);
                        }
                        ticket.setStatus(row.status);
                    }

                    const customer = customers.find(customer => customer.customerID === row.customer_id);
                    if (customer) {
                        customer.addTicket(ticket);
                    }
                }
            }

            if (!firstLoad) {
                firstLoad = new Date();
            } else { // Automatically assign new tickets to available agents
                const availableAgents = agents.filter(agent => agent.availability === 'Available');
                const unassignedTickets = tickets.filter(ticket => ticket.status === 'Unassigned' && (new Date(ticket.creationDate) > firstLoad));

                if (unassignedTickets.length > 0) {
                    unassignedTickets.forEach(async ticket => {
                        if (ticket.type !== 'Miscellaneous') { // Find agent with matching specialty for ticket
                            const matchingAgents = availableAgents.filter(agent => agent.specialties.some(specialty => specialty.includes(ticket.type)));
                            if (matchingAgents.length > 0) { // Randomly select matching agent to assign ticket to
                                const agent = matchingAgents[Math.floor(Math.random() * matchingAgents.length)]; 
                                ticket.setStatus('Assigned');
                                ticket.assignTo(agent.agentID);
                                agent.assignTicket(ticket.ticketID);

                                await pool.promise().query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Assigned', agent.agentID, ticket.ticketID]);
                                await pool.promise().query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(ticket.ticketID), agent.agentID]);
                            }
                        } else { // Randomly select agent to assign ticket to if ticket type is miscellaneous
                            const agent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
                            ticket.setStatus('Assigned');
                            ticket.assignTo(agent.agentID);
                            agent.assignTicket(ticket.ticketID);

                            await pool.promise().query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Assigned', agent.agentID, ticket.ticketID]);
                            await pool.promise().query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(ticket.ticketID), agent.agentID]);
                        }
                    });
                }

                firstLoad = new Date(); // Prevent multiple attempts to assign tickets
            }
        } catch (err) {
            console.error('Error loading customers and tickets from database:', err);
        }
    }, 60 * 1000); 
});

// Close database connection
process.on('SIGINT', () => {
    pool.end();
    console.log('Database connection closed');
    process.exit();
});