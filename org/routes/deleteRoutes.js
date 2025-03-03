const express = require('express');
const router = express.Router();
const pool = require('../db');

// Delete user from database and memory
router.post('/api/delete-user', async (req, res) => {
    const { role, userId } = req.body;
    try {
        if (role === 'admin') {
            const admin = admins.find(admin => admin.adminID === userId);
            if (admin) {
                if (req.session.user.adminID === userId) { // Prevent user from deleting their own account while logged in
                    return res.status(400).json({ error: 'Cannot delete currently logged in user' });
                }
                admins.splice(admins.indexOf(admin), 1);
                await pool.promise().query('DELETE FROM administrators WHERE admin_id = ?', [userId]);
            }
        } else if (role === 'agent') {
            const agent = agents.find(agent => agent.agentID === userId);
            if (agent) {
                agent.splice(agents.indexOf(agent), 1);
                await pool.promise().query('DELETE FROM agents WHERE agent_id = ?', [userId]);
            }
        }
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch(err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Delete task from database and memory
router.post('/api/delete-task', async (req, res) => {
    const { taskId } = req.body;
    try {
        const task = tasks.find(task => task.taskID === taskId);
        if (task) {
            tasks.splice(tasks.indexOf(task), 1);
            await pool.promise().query('DELETE FROM tasks WHERE task_id = ?', [taskId]);

            task.assignedTo.forEach(async (agentID) => { // Remove task from each assigned agent's tasks array
                const agent = agents.find(agent => agent.agentID === Number(agentID));
                if (agent) {
                    agent.removeTask(task.taskID);
                    await pool.promise().query('UPDATE agents SET tasks = ? WHERE agent_id = ?', [JSON.stringify(agent.tasks), agentID]);
                }
            });
        }
        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
});