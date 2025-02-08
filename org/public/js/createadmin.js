const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

const adminForm = document.getElementById('adminForm');
adminForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const container = document.getElementById('error-container');
    container.innerHTML = ''; 
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true; // Prevent duplicate submissions

    // Data collection
    const forename = document.getElementById('forename').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (password !== confirmPassword) { 
        showError('Passwords do not match');
        submitButton.disabled = false;
        return;
    } 

    try { // Send data to backend to create administrator account
        const adminData = { forename, surname, email, phone, password };
        const response = await fetch(`${baseUrl}/api/create-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminData),
        });

        const result = await response.json();

        if (result.success) { // Send verification email
            const sendVerificationEmail = async () => {
                const emailResponse = await fetch(`${baseUrl}/api/email-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, type: 'email' })
                });

                const emailResult = await emailResponse.json();

                if (emailResult.success) {
                    showError('Administrator account created successfully', 'neutral');
                } else {
                    showError('Administrator account created successfully, but failed to send verification email. The user must request the verification email to be resent when they first attempt to log in.');
                }
            };
            
            await sendVerificationEmail();
            submitButton.disabled = false;
        } else { // Show all validation errors
            result.errors.forEach(error => showError(error));
            submitButton.disabled = false;
        }
    } catch (err) {
        showError('Failed to create administrator account');
        submitButton.disabled = false;
    }
});