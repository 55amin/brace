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
            'SELECT COUNT(*) as count FROM customers WHERE email = ?',
            [validatedEmail.value]);
        if (rowsEmail[0].count > 0) {
            const existingCustomer = rowsEmail[0];
            const customer = customers.find(customer => customer.customerID === existingCustomer.customer_id);

            if (customer && (customer.ticket === null)) { // Customers without open ticket can open a ticket
                req.session.user = { email: validatedEmail.value, customerID: customer.customerID };
                return res.status(200).json({ success: true, message: 'Customer already registered but does not have a ticket' });
            } else if (customer && customer.ticket) { // Customers with open ticket cannnot open another ticket
                req.session.user = { email: validatedEmail.value, customerID: customer.customerID };
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
        const query = 'INSERT INTO tickets (title, description, type, created_at, created_by) VALUES (?, ?, ?, ?, ?)';
        const values = [
            validatedTitle.value,
            validatedDesc.value,
            type,
            creationDate,
            creator
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

        const customer = customers.find(customer => customer.customerID === creator);
        if (customer) { // Add ticket to associated customer
            customer.addTicket(newTicket);
            await pool.promise().query('UPDATE customers SET ticket_id = ? WHERE customer_id = ?',
                [newTicket.ticketID, customer.customerID]);
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

            const customer = new Customer(row.username, row.email, row.registered_at);
            customer.setCustomerID(row.customer_id);
            customers.push(customer);
        }

        for (const row of ticketRows) {
            if ((new Date(row.created_at) < weekAgo) && row.status === 'Completed') { // Delete ticket from database
                await pool.promise().query('DELETE FROM tickets WHERE ticket_id = ?', [row.ticket_id]);
                continue; // Skip adding ticket to in-memory array
            }

            const ticket = new Ticket(row.title, row.description, row.created_by, row.type, row.created_at);
            ticket.setTicketID(row.ticket_id);
            tickets.push(ticket);

            if (row.triage === 1) { // Triage in-memory ticket if ticket in database triaged
                ticket.triage();
            }
            if (row.priority > 1) { // Set correct priority for in-memory ticket based on priority of ticket in database 
                ticket.setPriority (row.priority);
            }


            const customer = customers.find(customer => customer.customerID === row.customer_id);
            if (customer) {
                customer.addTicket(ticket);
            }
        }
        console.log(`Loaded ${customers.length} customers and ${tickets.length} tickets into memory.`);
    } catch (err) {
        console.error('Error loading customers and tickets from database:', err);
    }

    setInterval(async () => { // Check if ticket deadlines have passed every minute
        try {
            for (const ticket of tickets) {
                const currentDate = new Date();
                if ((currentDate > ticket.deadline) && (ticket.priority < 3)) { // Raise priority accordingly in memory and database
                    ticket.raisePriority();
                    await pool.promise().query('UPDATE tickets SET priority = ? WHERE ticket_id = ?', [ticket.priority, ticket.ticketID]);
                }
            }
        } catch (err) {
            console.error('Error updating ticket priorities:', err);
        }
    }, 60 * 1000); 
});