const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

const durationForm = document.getElementById('durationForm');
durationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const container = document.getElementById('error-container');
    container.innerHTML = '';
    const submitButton = document.getElementById('submit-duration');
    submitButton.disabled = true;
    const duration = document.getElementById('duration').value;;

    try {
        const response = await fetch(`${baseUrl}/api/update-duration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ duration }),
        });

        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
            submitButton.disabled = false;
        } else {
            showError(result.message);
            submitButton.disabled = false;
        }
    } catch (error) {
        showError('Failed to update break duration');
        submitButton.disabled = false;
    }
});

const frequencyForm = document.getElementById('frequencyForm');
frequencyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const container = document.getElementById('error-container');
    container.innerHTML = '';
    const submitButton = document.getElementById('submit-frequency');
    submitButton.disabled = true;
    const frequency = document.getElementById('frequency').value;;

    try {
        const response = await fetch(`${baseUrl}/api/update-frequency`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frequency }),
        });

        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
            submitButton.disabled = false;
        } else {
            showError(result.message);
            submitButton.disabled = false;
        }
    } catch (error) {
        showError('Failed to update break frequency');
        submitButton.disabled = false;
    }
});