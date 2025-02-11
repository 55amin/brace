const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

document.addEventListener('DOMContentLoaded', async () => {
    try { // Fetch all agents from in-memory array to assign task to
        const response = await fetch(`${baseUrl}/api/get-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'agent' }),
        });
        const result = await response.json();

        if (result.success) {
            const agentContainer = document.getElementById('agent-container');
            result.users.forEach(agent => { // Create checkbox input for each agent
                const agentRow = document.createElement('div');
                agentRow.className = 'agent-row';
                agentRow.innerHTML = `
                    <label>
                        <input type="checkbox" name="assignedTo" value="${agent.agentID}">
                        ${agent.username}
                    </label>
                `;
                agentContainer.appendChild(agentRow);
            });
        } else {
            showError('Failed to fetch agents');
        }
    } catch (err) {
        showError('Error fetching agents');
    }

    const taskForm = document.getElementById('taskForm');
    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const container = document.getElementById('error-container');
        container.innerHTML = ''; 
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true; // Prevent duplicate submissions

        // Data collection
        const title = document.getElementById('title').value.trim();
        const desc = document.getElementById('desc').value.trim();
        const deadline = document.getElementById('deadline').value;
        const assignedTo = Array.from(document.querySelectorAll('#agent-container input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

        // Data validation
        if (assignedTo.length === 0) {
            showError('Task must be assigned to at least one agent');
            submitButton.disabled = false;
            return;
        }

        try { // Send data to backend to create task
            const taskData = { title, desc, deadline, assignedTo };
            const response = await fetch(`${baseUrl}/api/create-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();

            if (result.success) {
                showError('Task created successfully', 'neutral');
                taskForm.reset();
                submitButton.disabled = false;
            } else {
                result.errors.forEach(error => showError(error));
                submitButton.disabled = false;
            }
        } catch (err) {
            showError('Failed to create task');
            submitButton.disabled = false;
        }
    });
});