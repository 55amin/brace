const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Customer = require('./public/models/customer');
const Ticket = require('./public/models/ticket')
const {
    validateUsername,
    validateEmail,
    validateTitle,
    validateDesc,
    validateMessage
} = require('./utils/validation');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
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
    expiration: 1000 * 60 * 60 * 24 // Sessions expire after 24 hours of inactivity
}, pool);

app.set('trust proxy', 1);
app.use(session({ // Configure user session
    store: sessionStore,
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24
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
const tickets = [];

io.on('connection', (socket) => { // Handle new customer connection
    console.log('New customer connected');

    socket.on('joinRoom', (data) => {
        const { ticketID } = data;
        const customerID = socket.handshake.session.user.customerID;
        if (customerID) {
            socket.join(ticketID);
            console.log(`Customer ${customerID} joined room ${ticketID}`);
        } else {
            socket.disconnect();
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// API to send a message
app.post('/api/send-message', async (req, res) => {
    const { message } = req.body;
    const customerID = req.session.user.customerID;
    const ticketID = req.session.user.ticketID;
    const validatedMessage = validateMessage(message);
    if (!validatedMessage.isValid) {
        return res.status(400).json({ success: false, message: validatedMessage.error });
    }

    try {
        const encryptedMessage = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY).update(validatedMessage, 'utf8', 'hex');
        await pool.promise().query(
            'INSERT INTO messages (ticket_id, customer_id, message, created_at) VALUES (?, ?, ?, ?)',
            [ticketID, customerID, encryptedMessage, new Date()]
        );
        // Emit the message to the room using Socket.IO
        io.to(ticketID).emit('receiveMessage', { customerID, message: encryptedMessage });
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Return all messages
app.post('/api/get-messages', async (req, res) => {
    const ticketID = req.session.user.ticketID;

    try {
        const [rows] = await pool.promise().query('SELECT * FROM messages WHERE ticket_id = ?', [ticketID]);
        res.status(200).json({ success: true, messages: rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

app.get('/', (req, res) => {
    res.redirect('/index.html'); 
});

app.get('/ticketcreation.html', (req, res) => {
    res.redirect('/ticketcreation.html');
});

app.get('/chat.html', (req, res) => { // Serve chat page based on customer's session and details
    if (req.session.user && req.session.user.customerID) {
        res.sendFile(path.join(__dirname, 'public', 'chat.html'));
    } else {
        res.redirect('/index.html'); // Redirect to registration page if customer does not have session 
    }
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
        const [rowsEmail] = await pool.promise().query( // Check if email address exists in database
            'SELECT * FROM customers WHERE email = ?', [validatedEmail.value]);
        if (rowsEmail.length > 0) {
            const existingCustomer = rowsEmail[0];
            
            if (existingCustomer.ticket_id === null) { // Customers without open ticket can open a ticket
                req.session.user = { email: validatedEmail.value, customerID: existingCustomer.customer_id };
                return res.status(200).json({ success: true, message: 'Customer already registered but does not have a ticket' });
            } else if (existingCustomer.ticket_id) { // Customers with open ticket cannot open another ticket
                req.session.user = { email: validatedEmail.value, customerID: existingCustomer.customer_id, ticketID: existingCustomer.ticket_id };
                return res.status(400).json({ success: false, error: 'Customer already has ticket open' });
            }
        }

        // Insert customer details into database
        const query = 'INSERT INTO customers (username, email, registered_at) VALUES (?, ?, ?)';
        const values = [validatedUsername.value, validatedEmail.value, new Date()];
        const [results] = await pool.promise().query(query, values);

        // Create new customer instance and add customerID from database
        const newCustomer = new Customer(validatedUsername.value, validatedEmail.value, new Date());
        newCustomer.setCustomerID(results.insertId);
        customers.push(newCustomer);

        req.session.user = { email: validatedEmail.value, customerID: newCustomer.customerID }; // Create session for customer
        res.status(200).json({ success: true, message: 'Customer registered successfully' });
    } catch (error) {
        console.error('Error registering customer:', error);
        res.status(500).json({ success: false, message: 'Failed to register customer' });
    }
});

// Create ticket
app.post('/api/create-ticket', async (req, res) => {
    const { title, desc, type } = req.body;
    const validatedTitle = validateTitle(title);
    const validatedDesc = validateDesc(desc);
    const errors = []; // Push validation error messages to array
    const creationDate = new Date();
    const creator = req.session.user.customerID;

    if (!validatedTitle.isValid) errors.push(validatedTitle.error);
    if (!validatedDesc.isValid) errors.push(validatedDesc.error);
    if (!creator) errors.push('Associated customer not found')
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Insert ticket details into database
        const query = 'INSERT INTO tickets (title, description, type, created_at, created_by, priority_level) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [
            validatedTitle.value,
            validatedDesc.value,
            type,
            creationDate,
            creator,
            1
        ];
        const [results] = await pool.promise().query(query, values);

        const newTicket = new Ticket( // Create new ticket instance and add ticketID from database
            validatedTitle.value,
            validatedDesc.value,
            creator,
            type,
            creationDate
        );
        newTicket.setTicketID(results.insertId);
        tickets.push(newTicket);
        await pool.promise().query('UPDATE tickets SET deadline = ? WHERE ticket_id = ?', [newTicket.deadline, newTicket.ticketID]);

        const customer = customers.find(customer => customer.customerID === creator);
        if (customer) { // Add ticket to associated customer
            customer.addTicket(newTicket);
            await pool.promise().query('UPDATE customers SET ticket_id = ? WHERE customer_id = ?', [newTicket.ticketID, customer.customerID]);
            req.session.user.ticketID = newTicket.ticketID;
        }

        res.status(200).json({ success: true, message: 'Ticket created successfully', ticketId: results.insertId });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    setInterval(async () => { // // Execute every minute to sync with database and organisation-facing website
        try { // Load customers and tickets from database into memory
            const [customerRows] = await pool.promise().query('SELECT * FROM customers ORDER BY customer_id ASC');
            const [ticketRows] = await pool.promise().query('SELECT * FROM tickets ORDER BY ticket_id ASC');
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            for (const row of customerRows) {
                if (new Date(row.registered_at) < weekAgo) {
                    const [ticketCount] = await pool.promise().query('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [row.customer_id]);
                    if (ticketCount[0].count === 0) { // Delete customer from database
                        await pool.promise().query('DELETE FROM customers WHERE customer_id = ?', [row.customer_id]);
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
                    if (new Date(row.created_at) < weekAgo) { // Delete ticket from database
                        await pool.promise().query('DELETE FROM tickets WHERE ticket_id = ?', [row.ticket_id]);
                    }
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
                    if (row.status !== 'Unassigned') { // Change status of in-memory ticket based on status of ticket in database
                        ticket.setStatus(row.status);
                    }

                    const customer = customers.find(customer => customer.customerID === row.customer_id);
                    if (customer) {
                        customer.addTicket(ticket);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading customers and tickets from database:', err);
        }

        try {
            for (const ticket of tickets) { 
                const currentDate = new Date();
                const pastDeadline = currentDate > ticket.deadline;
                let newPriority;
        
                if (ticket.triaged && pastDeadline) {
                    newPriority = 3;
                } else if (ticket.triaged || pastDeadline) {
                    newPriority = 2;
                } else {
                    newPriority = 1;
                }
        
                if (newPriority !== ticket.priority) {
                    ticket.setPriority(newPriority);
                    await pool.promise().query(
                        'UPDATE tickets SET priority_level = ? WHERE ticket_id = ?',
                        [newPriority, ticket.ticketID]
                    );
                }
            }
        } catch (err) {
            console.error('Error updating ticket priorities:', err);
        }
    }, 60 * 1000); 
});