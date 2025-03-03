const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { admins, agents, tasks, customers, tickets } = require('../server');

// Return all users
router.post('/get-users', async (req, res) => {
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
router.post('/get-tasks', async (req, res) => {
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
router.post('/get-user-tasks', async (req, res) => {
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
router.post('/get-tickets', async (req, res) => {
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

// Check if an administrator exists in database
router.get('/check-admin', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM administrators');
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
router.get('/check-agent', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM agents');
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

// Check if a user is assigned to a ticket
router.post('/check-assign', async (req, res) => {
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

module.exports = router;