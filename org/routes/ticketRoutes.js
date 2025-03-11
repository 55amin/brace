const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { agents, tickets, customers } = require('../server');
const mail = require('../utils/mail');

router.post('/drop-ticket', async (req, res) => {
    try {
        const agentID = req.session.user.agentID;
        let ticketID;
        
        if (agentID) { // Remove ticket from agent in memory and in database and update status
            const agent = agents.find(agent => agent.agentID === agentID);
            ticketID = agent.ticket;
            agent.completeTicket();
            agent.setAvailability('Available');
            await pool.query('UPDATE tickets SET status = ?, assigned_to = null WHERE ticket_id = ?', ['Unassigned', ticketID]);
            await pool.query('UPDATE agents SET ticket = null WHERE ticket = ?', ticketID);
        } else {
            res.status(400).json({ success: false, error: 'Agent or ticket not found' });
        }

        const ticket = tickets.find(ticket => ticket.ticketID === ticketID);
        if (ticket) {
            ticket.setStatus('Unassigned'); // Mark ticket as unassigned
            ticket.assignedTo = null; // Unassign agent
        } else {
            res.status(400).json({ success: false, error: 'Ticket not found' });
        }
        
        res.status(200).json({ success: true, message: 'Ticket dropped successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: 'User unauthenticated or unauthorised' });
    }
});

router.post('/close-ticket', async (req, res) => {
    try {
        const agentID = req.session.user.agentID;
        let ticketID;
        let agent;
        let customer;
        
        if (agentID) { // Remove ticket from agent in memory and in database
            agent = agents.find(agent => agent.agentID === agentID);
            ticketID = agent.ticket;
            agent.completeTicket();
            await pool.query('UPDATE tickets SET status = ? WHERE ticket_id = ?', ['Complete', ticketID]);
            await pool.query('UPDATE agents SET ticket = null WHERE ticket = ?', ticketID);
        } else {
            res.status(400).json({ success: false, error: 'Agent or ticket not found' });
        }
        
        const ticket = tickets.find(ticket => ticket.ticketID === ticketID);
        if (ticket) {
            ticket.setStatus('Complete') // Mark ticket as complete
            customer = customers.find(customer => customer.customerID === ticket.creator);
            if (customer) { // Remove ticket from customer
                customer.removeTicket(ticket);
            } else {
                res.status(400).json({ success: false, error: 'Customer not found' });
            }
        } else {
            res.status(400).json({ success: false, error: 'Ticket not found' });
        }
        
        await mail.sendMail({ // Send email to customer with relevant ticket details
            from: `Brace for Techmedic <${proecss.env.EMAIL_ADDRESS}>`,
            to: customer.email,
            subject: 'Brace: Your ticket has been closed',
            text: `Hi ${customer.username},\n
                   Your ticket, '${ticket.title}', has been closed.\n
                   Description: ${ticket.desc}\n
                   Type: ${ticket.type}\n
                   Agent: ${agent.username}`
        });
        res.status(200).json({ success: true, message: 'Ticket closed and customer notified successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: 'User unauthenticated or unauthorised' });
    }
});

module.exports = router;
