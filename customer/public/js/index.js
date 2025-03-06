const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

document.addEventListener('DOMContentLoaded', () => {
    const customerReg = document.getElementById('customerReg');
    customerReg.addEventListener('submit', async (event) => {
        event.preventDefault();
        const container = document.getElementById('error-container');
        container.innerHTML = ''; 
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true; // Prevent duplicate submissions

        // Data collection
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();

        try { // Send data to backend to register customer
            const response = await fetch(`${baseUrl}/api/customer-reg`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email }),
            });
            const result = await response.json();
            
            if (result.success) { // Redirect customer to ticket creation page
                window.location.href = 'ticketcreation.html';
            } else if (result.error === 'Customer already has ticket open') {
                window.location.href = 'chat.html';
            } else {
                showError(result.error)
            }
        } catch (err) {
            showError('Failed to register customer');
            submitButton.disabled = false;
        }
    });
});
