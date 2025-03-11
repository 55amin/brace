const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { admins, agents, tickets, customers } = require('../server');
const mail = require('../utils/mail');

router.post('/close-ticket', async (req, res) => {
    try {
        const user = req.session.user;
        let ticketID;
        if (user.agentID) {
            const agent = agents.find(agent => agent.agentID === user.agentID);
            ticketID = agent.ticket;
            agent.completeTicket();
            await pool.query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Complete', agent.agentID, ticketID]);
        } else if (user.adminID) {
            const admin = admins.find(admin => admin.adminID === user.adminID);
            ticketID = admin.ticket;
            admin.completeTicket();
            await pool.query('UPDATE tickets SET status = ?, assigned_to = ? WHERE ticket_id = ?', ['Complete', admin.adminID, ticketID]);
        } else {
            res.status(400).json({ success: false, error: 'Agent/admin or ticket not found' });
        }
        
        const ticket = tickets.find(agent => agent.agentID === user.agentID);
        await mail.sendMail({
            from: `Brace for Techmedic <${process.env.EMAIL_ADDRESS}>`,
            to: admin.email,
            subject: 'Brace: Your ticket has been closed',
            text: `Hi {`
        });
        res.status(200).json({ success: true, message: 'Ticket closed and customer notified successfully' });
    } catch (err) {
        res.status(400).json({ success: false, error: 'User unauthenticated or unauthorised' });
    }
});

module.exports = router;
