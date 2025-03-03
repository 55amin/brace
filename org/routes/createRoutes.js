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
const Administrator = require('../public/models/administrator');
const Agent = require('../public/models/agent');
const Task = require('../public/models/task');
const bcrypt = require('bcrypt');
const pool = require('../db');

// Create administrator account
router.post('/create-admin', async (req, res) => {
    const { forename, surname, email, phone, password } = req.body;
    const validatedForename = validateName(forename);
    const validatedSurname = validateName(surname);
    const validatedEmail = validateEmail(email);
    const validatedPhone = validatePhone(phone);
    const validatedPassword = validatePassword(password);

    // Push validation error messages to array
    const errors = [];
    if (!validatedForename.isValid) {
        errors.push(validatedForename.error);
    } else if (!validatedSurname.isValid) {
        errors.push(validatedSurname.error);
    }
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPhone.isValid) errors.push(validatedPhone.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const [rowsEmail] = await pool.query(
            'SELECT COUNT(*) as count FROM administrators WHERE email = ?',
            [validatedEmail.value] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            errors.push('Email address already registered');
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

        // Encrypt password using hashing algorithm, then insert admin details into database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        const query = 'INSERT INTO administrators (forename, surname, email, phone, hashed_password) VALUES (?, ?, ?, ?, ?)';
        const values = [
            validatedForename.value,
            validatedSurname.value,
            validatedEmail.value,
            validatedPhone.value,
            hashedPassword
        ];
        const [results] = await pool.query(query, values);

        // Create new admin instance and add adminID from database
        const newAdmin = new Administrator(
            validatedForename.value,
            validatedSurname.value,
            validatedEmail.value,
            validatedPhone.value,
            hashedPassword
        );
        newAdmin.setAdminID(results.insertId);
        admins.push(newAdmin);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error creating admin:', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to create administrator account'] 
        });
    }
});

// Create agent account
router.post('/create-agent', async (req, res) => {
    const { username, email, accessLevel, workingHours, password, specialties } = req.body;
    const validatedUsername = validateUsername(username);
    const validatedEmail = validateEmail(email);
    const validatedPassword = validatePassword(password);
    
    // Push validation error messages to array
    const errors = [];
    if (!validatedUsername.isValid) errors.push(validatedUsername.error);
    if (!validatedEmail.isValid) errors.push(validatedEmail.error);
    if (!validatedPassword.isValid) errors.push(validatedPassword.error);
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const [rowsUsername] = await pool.query(
            'SELECT COUNT(*) as count FROM agents WHERE username = ?',
            [validatedUsername.value] // Check if username exists in database
        );
        if (rowsUsername[0].count > 0) {
            errors.push('Username taken');
            return res.status(400).json({ success: false, errors });
        }

        const [rowsEmail] = await pool.query(
            'SELECT COUNT(*) as count FROM agents WHERE email = ?',
            [validatedEmail.value] // Check if email address exists in database
        );
        if (rowsEmail[0].count > 0) {
            errors.push('Email address already registered');
            return res.status(400).json({ success: false, errors });
        }

        // Encrypt password using hashing algorithm, then insert agent details into database
        const hashedPassword = await bcrypt.hash(validatedPassword.value, 10);
        const query = 'INSERT INTO agents (username, email, access_level, working_hours, hashed_password, specialty) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [
            validatedUsername.value,
            validatedEmail.value,
            accessLevel,
            JSON.stringify(workingHours), // Store working hours as a JSON string
            hashedPassword,
            JSON.stringify(specialties), // Store specialties as a JSON string
        ];
        const [results] = await pool.query(query, values);
        
        // Create new agent instance and add agentID from database
        const newAgent = new Agent(
            validatedUsername.value,
            validatedEmail.value,
            accessLevel,
            workingHours,
            hashedPassword
        );
        newAgent.setAgentID(results.insertId);
        newAgent.setSpecialties(specialties);
        agents.push(newAgent);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error creating agent: ', err);
        res.status(500).json({ 
            success: false, 
            errors: ['Failed to create agent account'] 
        });
    }
});

// Create task
router.post('/create-task', async (req, res) => {
    const { title, desc, deadline, assignedTo } = req.body;
    const validatedTitle = validateTitle(title);
    const validatedDesc = validateDesc(desc);
    const validatedDeadline = validateDeadline(deadline);
    const errors = [];
    const creationDate = new Date();
    const creator = req.session.user.adminID;
    const completionStatus = {};
    assignedTo.forEach(agentID => {
        completionStatus[agentID] = false;
    });

    if (!validatedTitle.isValid) errors.push(validatedTitle.error);
    if (!validatedDesc.isValid) errors.push(validatedDesc.error);
    if (!validatedDeadline.isValid) errors.push(validatedDeadline.error);
    if (!assignedTo) errors.push('Task must be assigned to at least one agent')
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    try {
        const query = 'INSERT INTO tasks (title, description, deadline, assigned_to, created_at, created_by, completion_status) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [
            validatedTitle.value,
            validatedDesc.value,
            validatedDeadline.value,
            JSON.stringify(assignedTo),
            creationDate,
            creator,
            JSON.stringify(completionStatus)
        ];
        const [results] = await pool.query(query, values);

        const newTask = new Task( // Create new task instance and add taskID from database
            validatedTitle.value,
            validatedDesc.value,
            creator,
            validatedDeadline.value,
            assignedTo,
            creationDate
        );
        newTask.taskID = results.insertId;
        tasks.push(newTask);

        assignedTo.forEach(async (agentID) => { // Add task to each assigned agent
            const agent = agents.find(agent => agent.agentID === Number(agentID));
            if (agent) {
                agent.addTask(newTask.taskID);
                await pool.query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
            }
        });
        res.status(200).json({ success: true, task: newTask });
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ success: false, errors: ['Failed to create task'] });
    }
});

module.exports = router;