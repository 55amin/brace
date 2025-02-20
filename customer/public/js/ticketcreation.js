const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

document.addEventListener('DOMContentLoaded', () => {
    const ticketForm = document.getElementById('ticketCreation');
    ticketForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const container = document.getElementById('error-container');
        container.innerHTML = ''; 
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true; // Prevent duplicate submissions

        // Data collection
        const title = document.getElementById('title').value.trim();
        const desc = document.getElementById('desc').value.trim();
        const type = document.getElementById('type').value;

        try { // Send data to backend to create ticket
            const ticketData = { title, desc, type };
            const response = await fetch(`${baseUrl}/api/create-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticketData),
            });
            const result = await response.json();
            
            if (result.success) { // Redirect customer to chat page
                window.location.replace('chat.html');
            } else {
                result.errors.forEach(error => showError(error));
                submitButton.disabled = false;
            }
        } catch (err) {
            showError('Failed to create ticket');
            submitButton.disabled = false;
        }
    });
});