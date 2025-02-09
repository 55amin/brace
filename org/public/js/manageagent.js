const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

function expand(agent, button) { // Display full details when expand button clicked
    let agentRow = button.closest('.agent-row');
    agent = JSON.parse(agentRow.dataset.agent);
    let workingHours = JSON.parse(agent.workingHours);
    let formattedHours = Object.entries(workingHours).map(([day, hours]) => {
        return `${day}: ${hours.start} - ${hours.end}`; // Format working hours for readability
    }).join('<br>');

    agentRow.innerHTML = `
    <h5>ID: ${agent.agentID}</h5>
    <h4>Username: ${agent.username}</h4>
    <h4 style="font-style: italic;">${agent.availability}</h4>
    <p>Email address: ${agent.email}</p>
    <p>Access level: ${agent.accessLevel}</p>
    <p>Working hours: ${formattedHours}</p>
    <p>Specialties: ${agent.specialties.join(', ')}</p>
    <button class="minimise-button" onclick="minimise(${agent.agentID}, this)">Minimise</button>
    <button class="edit-button" onclick="edit(${agent.agentID}, this)">Edit</button>
    <button class="delete-button" onclick="deleteagent(${agent.agentID}, this)">Delete agent</button>
`;
}

function minimise(agent, button) { // Only display basic details when minimise button clicked
    let agentRow = button.closest('.agent-row');
    agent = JSON.parse(agentRow.dataset.agent);
    agentRow.innerHTML = `
    <h5>ID: ${agent.agentID}</h5>
    <h4>Username: ${agent.username}</h4>
    <h4 style="font-style: italic;">${agent.availability}</h4>
    <button class="expand-button" onclick="expand(${agent.agentID}, this)">Expand</button>
`;
}

async function deleteAgent(agent, button) { // Delete agent when delete agent button clicked
    let agentRow = button.closest('.agent-row');
    agent = JSON.parse(agentRow.dataset.agent);
    let agentID = agent.agentID;

    // Confirm deletion using built-in browser alert before proceeding
    if (!confirm('Are you sure you want to delete this agent?')) {
        return;
    }

    const response = await fetch(`${baseUrl}/api/delete-user`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'agent', userId: agentID }),
    });
    const result = await response.json();

    if (result.success) {
        showError(result.message, 'neutral');
        agentRow.remove();
    } else {
        showError(result.error);
    }
}

function edit(agent, button) { // Display forms to update details when edit button clicked
    let agentRow = button.closest('.agent-row');
    agent = JSON.parse(agentRow.dataset.agent);
    let agentID = agent.agentID;
    agentRow.innerHTML = `
        <h5>ID: ${agentID}</h5>
        <form id="updateUsername-${agentID}" class="form" method="post">
            <label for="username" class="field-label">Username</label>
            <input class="text-field" maxlength="20" name="username" placeholder="Enter a new, unique username, up to 20 characters, containing only letters, numbers and underscores" type="text" id="username-${agentID}" required=""/>
            <input type="submit" class="submit-button" value="Update username"/>
        </form>
        <form id="updateEmail-${agentID}" class="form" method="post">
            <label for="email" class="field-label">Email address</label>
            <input class="text-field" maxlength="320" name="email" placeholder="Enter a new email address" type="email" id="email-${agentID}" required=""/>
            <input type="submit" class="submit-button" value="Update email address"/>
        </form>
        <form id="updateAccess-${agentID}" class="form" method="post">
            <select id="access-${agentID}" name="accessLevel" required="">
                <option value="" disabled selected>Select access level</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
            </select>
            <input type="submit" class="submit-button" value="Update access level"/>
        </form>
        <button class="minimise-button" onclick="minimise(${agentID}, this)">Minimise</button>
        <button class="delete-button" onclick="deleteagent(${agentID}, this)">Delete agent</button>
    `;

    // Call detail update APIs
    document.getElementById(`updateUsername-${agentID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById(`username-${agentID}`).value.trim();
        agentID = agent.agentID;
        const response = await fetch(`${baseUrl}/api/update-username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, userId: agentID }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
        } else {
            result.errors.forEach(error => showError(error));
        }
    });

    document.getElementById(`updateEmail-${agentID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById(`email-${agentID}`).value.trim();
        agentID = agent.agentID;
        const emailResponse = await fetch(`${baseUrl}/api/email-code`, { // Send verification email
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, type: 'email' }),
        });
        const emailResult = await emailResponse.json();

        if (emailResult.success) {
            const unverifyResponse = await fetch(`${baseUrl}/api/unverify-user`, { // Unverify user to trigger verification upon login
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: 'agent', userId: agentID }),
            });
            const unverifyResult = await unverifyResponse.json();

            if (unverifyResult.success) { 
                const updateResponse = await fetch(`${baseUrl}/api/update-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, role: 'agent', userId: agentID }),
                });
                const updateResult = await updateResponse.json();

                if (updateResult.success) {
                    showError(updateResult.message, 'neutral');
                } else {
                    updateResult.errors.forEach(error => showError(error));
                }
            }
        } else {
            emailResult.errors.forEach(error => showError(error));
        }
    });

    document.getElementById(`updateAccess-${agentID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const accessLevel = document.getElementById(`access-${agentID}`).value.trim();
        agentID = agent.agentID;
        const response = await fetch(`${baseUrl}/api/update-access`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accessLevel, userId: agentID }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
        } else {
            showError(result.error);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/get-users`, { // Fetch all agents from in-memory array
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'agent' }),
        });
        const result = await response.json();

        for (let agent of result.users) { // Display basic details for each agent
            let agentRow = document.createElement('div');
            agentRow.className = 'agent-row';
            agentRow.dataset.agent = JSON.stringify(agent); // Store agent object in element's dataset to be accessed by other functions
            agentRow.innerHTML = `
                <h5>ID: ${agent.agentID}</h5>
                <h4>Username: ${agent.username}</h4>
                <h4 style="font-style: italic;">${agent.availability}</h4>
                <button class="expand-button" onclick="expand(${agent.agentID}, this)">Expand</button>
            `;
            document.getElementById('agent-container').appendChild(agentRow);
        }
    } catch {
        showError('Error fetching agents');
    }
});

window.expand = expand;
window.minimise = minimise;
window.deleteagent = deleteAgent;
window.edit = edit;