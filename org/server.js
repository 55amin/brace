const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Administrator = require('./public/models/administrator');
const Agent = require('./public/models/agent');
const Task = require('./public/models/task');
const Customer = require('./public/models/customer');
const Ticket = require('./public/models/ticket');
const pool = require('./utils/db');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["https://brace-5m0g.onrender.com"],
        methods: ["GET", "POST"],
        credentials: true
    },
    path: "/socket.io/",
    transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('io', io);

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

const admins = [];
const agents = [];
const tasks = [];
const customers = [];
const tickets = [];

module.exports = {
    admins,
    agents,
    tasks,
    customers,
    tickets
};

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

// Import and use route files
const getRoutes = require('./routes/getRoutes');
const createRoutes = require('./routes/createRoutes');
const updateRoutes = require('./routes/updateRoutes');
const deleteRoutes = require('./routes/deleteRoutes');
const actionRoutes = require('./routes/actionRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api', getRoutes);
app.use('/api', createRoutes);
app.use('/api', updateRoutes);
app.use('/api', deleteRoutes);
app.use('/api', actionRoutes);
app.use('/api', chatRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    let firstLoad = null;
    
    try { // Load administrators from database into memory
        const [rows] = await pool.query('SELECT * FROM administrators ORDER BY admin_id ASC');
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
        const [rows] = await pool.query('SELECT * FROM agents ORDER BY agent_id ASC');
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
        const [rows] = await pool.query('SELECT * FROM tasks ORDER BY task_id ASC');
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
                        const [durationRows] = await pool.query('SELECT setting_value FROM config WHERE setting_name = "break_duration"');
                        const breakDuration = Number(durationRows[0].setting_value);
                        const [breakRows] = await pool.query('SELECT * FROM breaks WHERE agent_id = ? AND break_date = ?', [agent.agentID, currentDate]);
                        const ongoingBreak = breakRows.find(breakRow => {
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
            const [customerRows] = await pool.query('SELECT * FROM customers ORDER BY customer_id ASC');
            const [ticketRows] = await pool.query('SELECT * FROM tickets ORDER BY ticket_id ASC');
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            for (const row of customerRows) {
                if (new Date(row.registered_at) < weekAgo) {
                    const [ticketCount] = await pool.query('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [row.customer_id]);
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
                                await pool.query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Assigned', agent.agentID, ticket.ticketID]);
                                await pool.query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(ticket.ticketID), agent.agentID]);
                            }
                        } else { // Randomly select agent to assign ticket to if ticket type is miscellaneous
                            const agent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
                            ticket.setStatus('Assigned');
                            ticket.assignTo(agent.agentID);
                            agent.assignTicket(ticket.ticketID);

                            await pool.query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Assigned', agent.agentID, ticket.ticketID]);
                            await pool.query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(ticket.ticketID), agent.agentID]);
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

io.on('connection', (socket) => { // Check for new client connections
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Close database connection
process.on('SIGINT', () => {
    pool.end();
    console.log('Database connection closed');
    process.exit();
});
