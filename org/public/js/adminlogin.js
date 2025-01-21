const baseUrl = window.location.origin;

function showError(message, type = 'fail') { // Default parameter for common use case
    const container = document.getElementById('error-container');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
    if (type === 'neutral') { //  Apply different styles based on type
        errorMessage.style.color = 'white';
        errorMessage.style.border = 'white';
    } else if (type === 'success') {
        errorMessage.style.color = 'green';
        errorMessage.style.border = 'green';
    }
}

// Load all counters from local storage, so values don't change even if user refreshes/closes window
let resendAttempts = parseInt(localStorage.getItem('resendAttempts')) || 0;
let resendCooldown = parseInt(localStorage.getItem('resendCooldown')) || 0;


const loginForm = document.getElementById('adminlogin');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const container = document.getElementById('error-container');
    container.innerHTML = ''; 

    // Data collection
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try { // Send data to backend to authenticate user
        const loginData = { email, password };
        const response = await fetch(`${baseUrl}/api/admin-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (result.success) {
            window.location.replace('adminscreen.html'); // Redirect to admin screen if user logs in successfully
        } else if (result.message === 'Unverified') {
            document.getElementById('verification').style.display = 'inline-block';
            document.getElementById('code').style.display = 'inline-block';
            document.getElementById('code').required = true;
            document.getElementById('resend').style.display = 'inline-block';
            document.getElementById('resend-button').style.display = 'inline-block';
            document.getElementById('verify-button').style.display = 'inline-block';
            showError('Verification required. Please enter the verification code sent to your email.');
        } else { // Show all validation and login errors
            result.errors.forEach(error => showError(error));
        }
    } catch (err) { 
        showError('Failed to log in. Please try again.');
    }
});

verifyCode = document.getElementById('verify-button').
verifyCode.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();

    try {
        const verificationResponse = await fetch(`${baseUrl}/api/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, code, user: 'admin' })
        });

        const verificationResult = await verificationResponse.json();

        if (verificationResult.success) {
            document.getElementById('verification').style.display = 'none';
            document.getElementById('code').style.display = 'none';
            document.getElementById('code').required = false;
            document.getElementById('resend').style.display = 'none';
            document.getElementById('resend-button').style.display = 'none';
            document.getElementById('verify-button').style.display = 'none';
            localStorage.removeItem('resendAttempts');
            localStorage.removeItem('resendCooldown');
            showError(verificationResult.message, 'success')
        } else {
            showError(verificationResult.message)
        }

    } catch {
        console.error('Error verifying code:', error);
        showError('Failed to verify code');
    }
});

resendEmail = document.getElementById('resend-button').
resendEmail.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();

    try {
        const emailResponse = await fetch(`${baseUrl}/api/email-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, type: 'email' })
        });

        const emailResult = await emailResponse.json();

        if (emailResult.success) {
            showError('Verification code resent. Please check your emails.', 'neutral');
            resendAttempts++;
            resendCooldown = resendAttempts >= 3 ? 3600 : 60; // 1 hour cooldown if 3 or more attempts, 1 minute if less
            const cooldownEnd = Date.now() + resendCooldown * 1000;
            localStorage.setItem('cooldownEnd', cooldownEnd);
            resendButton.disabled = true; // Prevent user from using resend button during cooldown

            if (window.cooldownInterval) { // Clear existing cooldowns to prevent multiple cooldowns
                clearInterval(window.cooldownInterval);
            }

            window.cooldownInterval = setInterval(() => {
                const remainingTime = Math.ceil((cooldownEnd - Date.now()) / 1000);
                const cooldownTimer = document.getElementById('cooldown-timer');
        
                if (remainingTime > 0) { // Display cooldown
                    cooldownTimer.textContent = `Resend available in ${remainingTime} seconds.`;
                } else { // Clear interval when cooldown ends and re-enable resend button
                    clearInterval(window.cooldownInterval); 
                    cooldownTimer.textContent = ''; 
                    localStorage.removeItem('cooldownEnd'); 
                    resendButton.disabled = false; 
                }
            }, 1000);
        } else {
            showError('Failed to resend verification email. Please try again.');
        }
    } catch (error) {
        console.error('Error resending verification email:', error);
        showError('Failed to resend verification email. Please try again.');
    }
});