const express = require('express');
const router = express.Router();
const {
    validateName,
    validateUsername,
    validateEmail,
    validatePhone,
    validatePassword,
    validateTitle,
    validateDesc,
    validateDeadline
} = require('../utils/validation');
const bcrypt = require('bcrypt');
const pool = require('../utils/db');
const { admins, agents, tasks } = require('../server');

// Update forename
router.post('/update-forename', async (req, res) => {
    const { forename, userId = req.session.user.adminID } = req.body;
    const validatedForename = validateName(forename);
    const errors = [];

    if (!validatedForename.isValid) errors.push(validatedForename.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update forename in database
        await pool.query('UPDATE administrators SET forename = ? WHERE admin_id = ?', [forename, userId]);
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
router.post('/update-surname', async (req, res) => {
    const { surname, userId = req.session.user.adminID } = req.body;
    const validatedSurname = validateName(surname);
    const errors = [];

    if (!validatedSurname.isValid) errors.push(validatedSurname.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update surname in database
        await pool.query('UPDATE administrators SET surname = ? WHERE admin_id = ?', [surname, userId]);
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
router.post('/update-email', async (req, res) => {
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

    const [rowsEmail] = await pool.query(
        'SELECT COUNT(*) as count FROM ?? WHERE email = ?',
        [table, validatedEmail.value] // Check if email address exists in database
    );
    if (rowsEmail[0].count > 0) {
        errors.push('Email address already registered');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update email address in database
        if (role === 'admin') {
            await pool.query('UPDATE administrators SET email = ? WHERE admin_id = ?', [email, userId]);
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                admin.email = email; // Update the in-memory admin's email address
            }
        } else if (role === 'agent') {
            await pool.query('UPDATE agents SET email = ? WHERE agent_id = ?', [email, userId]);
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
router.post('/update-phone', async (req, res) => {
    const { phone, userId = req.session.user.adminID } = req.body;
    const validatedPhone = validatePhone(phone);
    const errors = [];

    if (!validatedPhone.isValid) errors.push(validatedPhone.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    const [rowsPhone] = await pool.query(
        'SELECT COUNT(*) as count FROM administrators WHERE phone = ?',
        [validatedPhone.value] // Check if phone number exists in database
    );
    if (rowsPhone[0].count > 0) {
        errors.push('Phone number already registered');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update phone number in database
        await pool.query('UPDATE administrators SET phone = ? WHERE admin_id = ?', [phone, userId]);
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
router.post('/update-username', async (req, res) => {
    const { username, userId } = req.body;
    const validatedUsername = validateUsername(username);
    const errors = [];

    if (!validatedUsername.isValid) errors.push(validatedUsername.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    const [rowsUsername] = await pool.query(
        'SELECT COUNT(*) as count FROM agents WHERE username = ?',
        [validatedUsername.value] // Check if username exists in database
    );
    if (rowsUsername[0].count > 0) {
        errors.push('Username taken');
        return res.status(400).json({ success: false, errors });
    }

    try { // Update username in database
        await pool.query('UPDATE agents SET username = ? WHERE agent_id = ?', [username, userId]);
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
router.post('/update-access', async (req, res) => {
    const { accessLevel, userId } = req.body;
    try { // Update access level in database
        await pool.query('UPDATE agents SET access_level = ? WHERE agent_id = ?', [accessLevel, userId]);
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
router.post('/update-hours', async (req, res) => {
    const { workingHours, userId } = req.body;

    try { // Update working hours in database
        await pool.query('UPDATE agents SET working_hours = ? WHERE agent_id = ?', [JSON.stringify(workingHours), userId]);
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
router.post('/update-specialties', async (req, res) => {
    const { specialties, userId } = req.body;

    try { // Update specialties in database
        await pool.query('UPDATE agents SET specialty = ? WHERE agent_id = ?', [JSON.stringify(specialties), userId]);
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
router.post('/update-password', async (req, res) => {
    const { password, userId } = req.body;
    const validatedPassword = validatePassword(password);
    const errors = [];

    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update password in database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        await pool.query('UPDATE agents SET hashed_password = ? WHERE agent_id = ?', [hashedPassword, userId]);
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
router.post('/update-title', async (req, res) => {
    const { title, taskId } = req.body;
    const validatedTitle = validateTitle(title);
    const errors = [];

    if (!validatedTitle.isValid) errors.push(validatedTitle.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update title in database
        await pool.query('UPDATE tasks SET title = ? WHERE task_id = ?', [validatedTitle.value, taskId]);
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
router.post('/update-desc', async (req, res) => {
    const { desc, taskId } = req.body;
    const validatedDesc = validateDesc(desc);
    const errors = [];

    if (!validatedDesc.isValid) errors.push(validatedDesc.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update description in the database
        await pool.query('UPDATE tasks SET description = ? WHERE task_id = ?', [validatedDesc.value, taskId]);
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
router.post('/update-deadline', async (req, res) => {
    const { deadline, taskId } = req.body;
    const validatedDeadline = validateDeadline(deadline);
    const errors = [];

    if (!validatedDeadline.isValid) errors.push(validatedDeadline.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try { // Update deadline in database
        await pool.query('UPDATE tasks SET deadline = ? WHERE task_id = ?', [validatedDeadline.value, taskId]);
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
router.post('/update-assign', async (req, res) => {
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

        await pool.query('UPDATE tasks SET assigned_to = ?, completion_status = ? WHERE task_id = ?', [JSON.stringify(assignedTo), JSON.stringify(completionStatus), taskId]);
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            task.assignedTo.forEach(async (agentID) => { // Remove task from previously assigned agents
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.removeTask(task.taskID);
                    await pool.query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
                }
            });

            task.assignedTo = assignedTo; // Update the in-memory task's assigned agents
            task.completionStatus = completionStatus; 
            assignedTo.forEach(async (agentID) => { // Add task to newly assigned agents
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.addTask(task.taskID);
                    await pool.query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
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
router.post('/update-duration', async (req, res) => {
    const { duration } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM config WHERE setting_name = "break_duration"');
        if (rows.length > 0) {
            await pool.query('UPDATE config SET setting_value = ? WHERE setting_name = "break_duration"', [duration]);
        } else {
            await pool.query('INSERT INTO config (setting_name, setting_value) VALUES (?, ?)', ['break_duration', duration]);
        }
        res.status(200).json({ success: true, message: 'Break duration updated successfully' });
    } catch (error) {
        console.error('Error updating break duration:', error);
        res.status(500).json({ success: false, message: 'Failed to update break duration' });
    }
});

// Update break frequency
router.post('/update-frequency', async (req, res) => {
    const { frequency } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM config WHERE setting_name = "break_frequency"');
        if (rows.length > 0) {
            await pool.query('UPDATE config SET setting_value = ? WHERE setting_name = "break_frequency"', [frequency]);
        } else {
            await pool.query('INSERT INTO config (setting_name, setting_value) VALUES (?, ?)', ['break_frequency', frequency]);
        }
        res.status(200).json({ success: true, message: 'Break frequency updated successfully' });
    } catch (error) {
        console.error('Error updating break frequency:', error);
        res.status(500).json({ success: false, message: 'Failed to update break frequency' });
    }
});

module.exports = router;