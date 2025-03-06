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

// Create chat room
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

    // Add the agent to the chat room
    req.app.get('io').to(ticketID).emit('joinRoom', { ticketID });
    res.status(200).json({ success: true, message: `Joined chat room ${ticketID} successfully`, ticketID });
});

// Send message
router.post('/send-message', async (req, res) => { // Needs patch
    const { message } = req.body;
    const agentID = req.session.user.agentID || req.session.user.adminID;
    const ticketID = req.session.user.ticketID; 
    const validatedMessage = validateMessage(message);
    if (!validatedMessage.isValid) {
        return res.status(400).json({ success: false, message: validatedMessage.error });
    }

    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encryptedMessage = cipher.update(validatedMessage.value, 'utf8', 'hex');
        encryptedMessage += cipher.final('hex');
        await pool.promise().query(
            'INSERT INTO messages (ticket_id, agent_id, message, created_at) VALUES (?, ?, ?, ?)',
            [ticketID, agentID, encryptedMessage, new Date()]
        );
        
        // Emit the message to the room
        req.app.get('io').to(ticketID).emit('receiveMessage', { agentID, message: encryptedMessage });
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
});

// Return all messages
router.post('/get-messages', async (req, res) => { 
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
    }

    try {
        const [rows] = await pool.promise().query('SELECT * FROM messages WHERE ticket_id = ?', [ticketID]);
        rows.foreach(row => {
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decryptedMessage = decipher.update(row.message, 'hex', 'utf8');
            decryptedMessage += decipher.final('utf8');
            row.message = decryptedMessage;
        });
        res.status(200).json({ success: true, messages: rows });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

module.exports = router;
