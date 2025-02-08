const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Add working hours options to form
    const hoursContainer = document.getElementById('workingHours');
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    workingDays.forEach(day => { // Create an option for each day of the week, with start and end time inputs
        const dayRow = document.createElement('div');
        dayRow.className = 'hoursRow';
        dayRow.innerHTML = `
            <label>
                <input type="checkbox" name="workingDays" value="${day} " id="${day.toLowerCase()}Checkbox">
                ${day}
            </label>
            <label for="${day.toLowerCase()}Start" style="font-style: italic;">Start: </label>
            <input type="time" id="${day.toLowerCase()}Start" name="workingHours[${day.toLowerCase()}][start]" placeholder="Start time" disabled>
            <label for="${day.toLowerCase()}End" style="font-style: italic;">End: </label>
            <input type="time" id="${day.toLowerCase()}End" name="workingHours[${day.toLowerCase()}][end]" placeholder="End time" disabled>
        `;
        hoursContainer.appendChild(dayRow);

        const checkbox = document.getElementById(`${day.toLowerCase()}Checkbox`);
        const startInput = document.getElementById(`${day.toLowerCase()}Start`);
        const endInput = document.getElementById(`${day.toLowerCase()}End`);

        checkbox.addEventListener('change', () => { // Enable/disable start and end time inputs based on whether day is selected
            if (checkbox.checked) {
                startInput.disabled = false;
                endInput.disabled = false;
            } else {
                startInput.disabled = true;
                endInput.disabled = true;
                startInput.value = '';
                endInput.value = '';
            }
        });
    });

    const agentForm = document.getElementById('agentForm');
    agentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const container = document.getElementById('error-container');
        container.innerHTML = ''; 
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true; // Prevent duplicate submissions

        // Data collection
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const accessLevel = document.getElementById('accessLevel').value;
        const specialties = Array.from(document.getElementById('specialties').selectedOptions).map(option => option.value);
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        
        // Data validation
        if (password !== confirmPassword) { 
            showError('Passwords do not match');
            submitButton.disabled = false;
            return;
        }

        let hasWorkingHours = false;
        const workingHours = {};
        workingDays.forEach(day => {
            const startInput = document.getElementById(`${day.toLowerCase()}Start`).value;
            const endInput = document.getElementById(`${day.toLowerCase()}End`).value;
            if (startInput < endInput) {
                hasWorkingHours = true;
                workingHours[day.charAt(0).toUpperCase() + day.slice(1)] = { start: startInput, end: endInput };
            }
        });

        if (!hasWorkingHours) { // Prevent form submission if no working hours are set
            showError('You must set at least one working hour for at least one day');
            submitButton.disabled = false;
            return;
        }

        try { // Send data to backend to create agent account
            const agentData = { username, email, accessLevel, workingHours, password, specialties };
            const response = await fetch(`${baseUrl}/api/create-agent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentData),
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
                        showError('Agent account created successfully', 'neutral');
                    } else {
                        showError('Agent account created successfully, but failed to send verification email. The user must request the verification email to be resent when they first attempt to log in.');
                    }
                };
                
                await sendVerificationEmail();
                submitButton.disabled = false;
            } else { // Show all validation errors
                result.errors.forEach(error => showError(error));
                submitButton.disabled = false;
            }
        } catch (err) {
            showError('Failed to create agent account');
            submitButton.disabled = false;
        }
    });
});