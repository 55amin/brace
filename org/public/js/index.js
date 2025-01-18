const dotenv = require('dotenv');
dotenv.config();
const baseUrl = process.env.BASE_URL || window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/check-admin`);
        const data = await response.json();
        
        if (!data.exists) { // Redirect to setup page if no admins exist
            window.location.href = 'setup.html';
            return; 
        }
    } catch (error) {
        console.error('Failed to check for admin:', error);
    }

    const agentLogin = document.getElementById('agent-login');
    agentLogin.addEventListener('click', async (event) => {
        event.preventDefault();

        try {
            const response = await fetch(`${baseUrl}/api/check-agent`);
            const data = await response.json();
        
            if (data.exists) { // Redirect to agent login page if an agent exists
                window.location.href = 'login/agentlogin.html';
            } else { // Redirect to agent not found page if no agents exist
                window.location.href = 'login/agentnotfound.html';
            }
        } catch (error) {
            console.error('Failed to check for agents:', error);
        }
    });
});