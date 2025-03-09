const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
const iv = Buffer.alloc(16, 0); 
const { validateMessage } = require('../utils/validation');
const { admins, agents } = require('../server');
const { client } = require('../utils/redis');

// Return ticket ID to allow user to join chat room
router.post('/create-chat', (req, res) => { 
    let ticketID;
    if (req.session.user.agentID) {
        const agent = agents.find(agent => agent.agentID === req.session.user.agentID);
        if (!agent) {
            return res.status(400).json({ success: false, message: 'Agent not found' });
        }
        ticketID = agent.ticket;
    } else if (req.session.user.adminID) {
        const admin = admins.find(admin => admin.adminID === req.session.user.adminID);
        if (!admin) {
            return res.status(400).json({ success: false, message: 'Admin not found' });
        }
        ticketID = admin.ticket;
    } else {
        return res.status(400).json({ success: false, message: 'User unauthenticated or unauthorised' });
    }

    if (!ticketID) {
        return res.status(400).json({ success: false, message: 'Ticket not found' });
    }

    res.status(200).json({ success: true, ticketID }); // Return the agent's assigned ticket ID
});

// Send message
router.post('/send-message', async (req, res) => { // Needs patch
    const { message } = req.body;
    const validatedMessage = validateMessage(message);
    if (!validatedMessage.isValid) {
        return res.status(400).json({ success: false, message: validatedMessage.error });
    }

    let ticketID;
    let agentID;
    if (req.session.user.agentID) {
        const agent = agents.find(agent => agent.agentID === req.session.user.agentID);
        if (!agent) {
            return res.status(400).json({ success: false, message: 'Agent not found' });
        }
        ticketID = agent.ticket;
        agentID = agent.agentID;
    } else if (req.session.user.adminID) {
        const admin = admins.find(admin => admin.adminID === req.session.user.adminID);
        if (!admin) {
            return res.status(400).json({ success: false, message: 'Admin not found' });
        }
        ticketID = admin.ticket;
        agentID = admin.adminID;
    } else {
        return res.status(400).json({ success: false, message: 'User unauthenticated or unauthorised' });
    }

    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encryptedMessage = cipher.update(validatedMessage.value, 'utf8', 'hex');
        encryptedMessage += cipher.final('hex');
        await pool.query(
            'INSERT INTO messages (ticket_id, agent_id, message, created_at) VALUES (?, ?, ?, ?)',
            [ticketID, agentID, encryptedMessage, new Date()]
        );
        const messageData = { agent_id: agentID, message: validatedMessage.value, created_at: new Date() };

        // Publish the message to Redis
        await client.publish('agentMessages', JSON.stringify({ ticketID, agent_id: agentID, encryptedMessage, created_at: new Date() }));
        
        // Emit the message to the room
        req.app.get('io').to(ticketID).emit('receiveMessage', messageData);
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

module.exports = router;
