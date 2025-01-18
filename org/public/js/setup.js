const dotenv = require('dotenv');
dotenv.config();
const baseUrl = process.env.BASE_URL || window.location.origin;


document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/check-admin`);
        const data = await response.json();
    
        if (data.exists) { // Redirect to startup page if an admin exists
            window.location.href = 'index.html';
            return; 
        }
    } catch (error) {
        console.error('Failed to check for admin:', error);
    }
});

function showError(message) {
    const container = document.getElementById('error-container');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
}

const setupForm = document.getElementById('setupForm');
setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const container = document.getElementById('error-container');
    container.innerHTML = ''; 

    // Data collection
    const forename = document.getElementById('forename').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (password !== confirmPassword) { 
        showError('Passwords do not match');
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
        if (result.success) {
            window.location.href = 'index.html'; // Redirect user to start-up screen
        } else { // Show all validation errors
            result.errors.forEach(error => showError(error));
        }
    } catch (err) {
        showError('Failed to create administrator account');
    }
});






