const baseUrl = window.location.origin;

window.addEventListener('load', () => {
    const cooldownEndU = parseInt(localStorage.getItem('cooldownEndU'));
    if (cooldownEndU > Date.now()) {
        resendEmail.disabled = true;
        updateEmail.disabled = true;

        window.cooldownInterval = setInterval(() => {
            const remainingTimeU = Math.ceil((cooldownEndU - Date.now()) / 1000);
            const cooldownTimer = document.getElementById('cooldown-timer');

            if (remainingTimeU > 0) {
                cooldownTimer.style.display = 'block';
                cooldownTimer.textContent = `Resend available in ${remainingTimeU} seconds.`;
            } else {
                clearInterval(window.cooldownInterval);
                cooldownTimer.textContent = '';
                localStorage.removeItem('cooldownEndU');
                resendEmail.disabled = false;
                updateEmail.disabled = false;
            }
        }, 1000);
    }
});

function showError(message, type = 'fail') { // Default parameter for common use case
    const container = document.getElementById('error-container');
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

function handleCooldown(button) {
    const cooldownEndU = Date.now() + resendCooldownU * 1000; 
    localStorage.setItem('cooldownEndU', cooldownEndU);
    button.disabled = true; // Disable button during cooldown

    if (window.cooldownInterval) { // Clear existing cooldown to prevent multiple cooldowns
        clearInterval(window.cooldownInterval);
    }

    window.cooldownInterval = setInterval(() => {
        const remainingTimeU = Math.ceil((cooldownEndU - Date.now()) / 1000);
        const cooldownTimer = document.getElementById('cooldown-timer');

        if (remainingTimeU > 0) { // Display cooldown
            cooldownTimer.textContent = `Resend available in ${remainingTimeU} seconds.`;
        } else { // Clear interval when cooldown ends and re-enable button
            clearInterval(window.cooldownInterval); 
            cooldownTimer.textContent = ''; 
            localStorage.removeItem('cooldownEndU'); 
            button.disabled = false; 
        }
    }, 1000);
}


const sendVerificationEmail = async (email) => {
    const emailResponse = await fetch(`${baseUrl}/api/email-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, type: 'email' })
    });

    const emailResult = await emailResponse.json();

    if (emailResult.success) {
        showError('Verification code sent. Please check your emails.', 'neutral');
        return true;
    } else {
        showError('Failed to send verification email');
        return false;
    }
}

// Load all counters from local storage, so values don't change even if user refreshes/closes window
let resendAttemptsU = parseInt(localStorage.getItem('resendAttemptsU')) || 0;
let resendCooldownU = parseInt(localStorage.getItem('resendCooldownU')) || 0;

document.addEventListener('DOMContentLoaded', () => {
    const updateForename = document.getElementById('updateForename');
    const updateSurname = document.getElementById('updateSurname');
    const updateEmail = document.getElementById('updateEmail');
    const updatePhone = document.getElementById('updatePhone');
    const resendEmail = document.getElementById('resendEmail');
    const errorContainer = document.getElementById('error-container');
    const cooldownTimer = document.getElementById('cooldown-timer');

    updateForename.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorContainer.innerHTML = ''; 
        const forename = document.getElementById('forename').value.trim();
        const response = await fetch(`${baseUrl}/api/update-forename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ forename }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral'); 
        } else {
            showError(result.message);
        }
    });

    updateSurname.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorContainer.innerHTML = '';
        const surname = document.getElementById('surname').value.trim();
        const response = await fetch(`${baseUrl}/api/update-surname`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ surname }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral'); 
        } else {
            showError(result.message);
        }
    });

    updateEmail.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorContainer.innerHTML = ''; 
        const email = document.getElementById('email').value.trim();
        const verifyEmail = document.getElementById('verifyEmail');
        const emailSent = await sendVerificationEmail(email); // Send verification email and store result

        if (emailSent) { // If email sent successfully, display verification form
            verifyEmail.style.display = 'block';
            resendEmail.style.display = 'block';
            cooldownTimer.style.display = 'block';

            resendAttemptsU++;
            resendCooldownU = resendAttemptsU >= 3 ? 3600 : 60; // 1 hour cooldown if 3 or more attempts, 1 minute if less
            localStorage.setItem('resendAttemptsU', resendAttemptsU);
            localStorage.setItem('resendCooldownU', resendCooldownU);
            handleCooldown(updateEmail); // Calculate and display cooldown

            verifyEmail.addEventListener('submit', async (event) => {
                event.preventDefault();
                const code = document.getElementById('code').value.trim();
                const verifyResponse = await fetch(`${baseUrl}/api/verify-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, code, user: 'admin' }),
                });
                const verifyResult = await verifyResponse.json();
                if (verifyResult.success) { // If verification successful, update email in database

                    const updateResponse = await fetch(`${baseUrl}/api/update-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email }),
                    });
                    const updateResult = await updateResponse.json();
                    if (updateResult.success) {
                        showError(updateResult.message, 'neutral');
                    } else {
                        updateResult.errors.forEach(error => showError(error)); 
                    }
                } else {
                    showError(verifyResult.message);
                }
            });
        } else {
            return;
        }
    });

    updatePhone.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorContainer.innerHTML = ''; 
        const phone = document.getElementById('phone').value.trim();
        const response = await fetch(`${baseUrl}/api/update-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral'); 
        } else {
            result.errors.forEach(error => showError(error)); 
        }
    });

    resendEmail.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();

        try {
            const emailResponse = await fetch(`${baseUrl}/api/email-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, type: 'password' })
            });

            const emailResult = await emailResponse.json();

            if (emailResult.success) {
                showError('Verification code sent. Please check your emails.', 'neutral');
                resendAttemptsU++;
                resendCooldownU = resendAttemptsU >= 3 ? 3600 : 60; // 1 hour cooldown if 3 or more attempts, 1 minute if less
                localStorage.setItem('resendAttemptsU', resendAttemptsU);
                localStorage.setItem('resendCooldownU', resendCooldownU);
                
                handleCooldown(resendEmail); // Calculate and display cooldown

            } else {
                showError('Failed to resend verification email');
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
            showError('Failed to resend verification email');
        }
    });
});