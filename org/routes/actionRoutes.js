const express = require('express');
const router = express.Router();
const {
    validateEmail,
    validatePassword
} = require('../utils/validation');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db');

// Notify admins of multiple failed login attempts
router.post('/notify-admin', async (req, res) => {
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
router.post('/email-code', async (req, res) => {
    const { email, type } = req.body;
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // Generate 6 character alphanumeric code
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
        await pool.query( // Delete any existing codes if a user tries to resend email
            'DELETE FROM verifications WHERE email = ?',
            [email]);

        await pool.query( // Insert email address and verification code into database
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

router.post('/verify-code', async (req, res) => {
    const { email, code, user } = req.body;
    currentTime = new Date();

    try {
        const [rows] = await pool.query( // Find the matching row
            'SELECT * FROM verifications WHERE email = ? AND code = ? AND expires_at > ?',
            [email, code, currentTime]);

        if (rows.length > 0) { // If a row matches, update the user's verification status in memory and database
            if (user === 'admin') {
                const admin = admins.find(admin => admin.email === email);
                if (admin) {
                    admin.setVerified();
                    await pool.query('UPDATE administrators SET verified = 1 WHERE email = ?', [email]); 
                }
            } else if (user === 'agent') { 
                const agent = agents.find(agent => agent.email === email);
                if (agent) {
                    agent.setVerified();
                    await pool.query('UPDATE agents SET verified = 1 WHERE email = ?', [email]); 
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

router.post('/unverify-user', async (req, res) => {
    const { role, userId } = req.body; // Get user type and ID
    try { // Unverify user in memory and database
        if (role === 'admin') {
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                admin.setUnverified();
                await pool.query('UPDATE administrators SET verified = 0 WHERE admin_id = ?', [userId]);
            }
        } else if (role === 'agent') {  
            const agent = agents.find(agent => agent.agentID === userId);
            if (agent) {
                agent.setUnverified();
                await pool.query('UPDATE agents SET verified = 0 WHERE agent_id = ?', [userId]);
            }
        }
        res.status(200).json({ success: true, message: 'User unverified successfully' });
    } catch {
        console.error('Error unverifying user:', err);
        res.status(500).json({ success: false, error: 'Failed to unverify user' });
    }
});

// Authenticate users
router.post('/login', async (req, res) => {
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
            const [rowsEmail] = await pool.query(
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
            const [rowsEmail] = await pool.query(
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
router.post('/reset-password', async (req, res) => {
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
        const [rows] = await pool.query( // Find the matching row
            'SELECT * FROM verifications WHERE email = ? AND type = ? AND expires_at > ?',
            [email, 'password', currentTime]);

        if (rows[0].count === 0) {
            errors.push('Verification expired or invalid');
            return res.status(400).json({ success: false, errors });
        }
    }

    try { // Update password in database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
            await pool.query(
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

// Complete task
router.post('/complete-task', async (req, res) => {
    const { taskId } = req.body;
    const agentId = req.session.user.agentID;
    try {
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.setComplete(agentId); // Update agent's completion status
            await pool.query('UPDATE tasks SET completion_status = ? WHERE task_id = ?', [JSON.stringify(task.completionStatus), taskId]);
            if (task.status === 'Completed') {
                await pool.query('UPDATE tasks SET status = ? WHERE task_id = ?', ['Completed', taskId]);
            }
        }
        const agent = agents.find(agent => agent.agentID === Number(agentId));
        const assignedToArray = JSON.parse(task.assignedTo);
        if (assignedToArray.includes(agentId)) { // Remove task from agent's tasks array
            agent.removeTask(task.taskID);
            await pool.query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentId]);
        }
        res.status(200).json({ success: true, message: 'Task completed successfully' });
    } catch (err) {
        console.error('Error completing task:', err);
        res.status(500).json({ success: false, message: 'Failed to complete task' });
    }
});

// Self-assign ticket
router.post('/assign-ticket', async (req, res) => {
    const { ticketId } = req.body;
    const agentId = req.session.user.agentID;
    try {
        const ticket = tickets.find(ticket => ticket.ticketID === ticketId);
        if (ticket.status === 'Unassigned') { // Update ticket status in memory and database
            ticket.setStatus('Assigned');
            await pool.query('UPDATE tickets SET status = ? WHERE ticket_id = ?', ['Assigned', ticketId]);
            ticket.assignTo(agentId);
            await pool.query('UPDATE tickets SET assigned_to = ? WHERE ticket_id = ?', [agentId, ticketId]);
        } else {
            return res.status(400).json({ success: false, message: 'Ticket already assigned' });
        }

        const agent = agents.find(agent => agent.agentID === Number(agentId));
        if (agent && !agent.ticket) {
            agent.assignTicket(ticketId); // Add ticket to agent
            agent.setAvailability('Unavailable'); // Set agent to unavailable
            await pool.query('UPDATE agents SET ticket = ? WHERE agent_id = ?', [JSON.stringify(agent.ticket), agentId]);
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
router.post('/start-break', async (req, res) => {
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
        await pool.query('DELETE FROM breaks WHERE agent_id = ? AND break_date < ?', [agentId, currentDate]);
        const [durationRows] = await pool.query('SELECT setting_value FROM config WHERE setting_name = "break_duration"');
        const [frequencyRows] = await pool.query('SELECT setting_value FROM config WHERE setting_name = "break_frequency"');
        const breakDuration = Number(durationRows[0].setting_value);
        const breakFrequency = Number(frequencyRows[0].setting_value);

        // Check if the agent has taken all breaks for the day or if there is an ongoing break
        const [breakRows] = await pool.query('SELECT * FROM breaks WHERE agent_id = ? AND break_date = ?', [agentId, currentDate]);
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
            await pool.query('UPDATE breaks SET break_number = ?, break_start = ? WHERE agent_id = ? AND break_date = ?', [breakRows[0].break_number + 1, currentTime, agentId, currentDate]);
            agent.setAvailability('Unavailable');
        } else if (breakRows.length === 0) { 
            agent.setAvailability('Unavailable');
            await pool.query('INSERT INTO breaks (agent_id, break_start, break_date, break_number) VALUES (?, ?, ?, ?)', [agentId, currentTime, currentDate, 1]);
        }
        res.status(200).json({ success: true, message: `Break started for ${breakDuration} minutes`, breakDuration });
    } catch (error) {
        console.error('Error starting break:', error);
        res.status(500).json({ success: false, message: 'Failed to start break' });
    }
});

module.exports = router;