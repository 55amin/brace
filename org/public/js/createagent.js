const baseUrl = window.location.origin;

function showError(message, type = 'fail') { // Default parameter for common use case
    const container = document.getElementById('error-container');
    container.innerHTML = '';
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
    if (type === 'neutral') { // Apply different styles based on type
        errorMessage.style.color = 'white';
        errorMessage.style.border = 'white';
    }
}

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
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (password !== confirmPassword) { 
        showError('Passwords do not match');
        submitButton.disabled = false;
        return;
    } 

    try { // Send data to backend to create agent account
        const agentData = { username, email, password };
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