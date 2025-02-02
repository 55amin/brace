const baseUrl = window.location.origin;

window.addEventListener('load', () => {
    const cooldownEndR = parseInt(localStorage.getItem('cooldownEndR'));
    if (cooldownEndR > Date.now()) {
        resendEmail.disabled = true;

        window.cooldownInterval = setInterval(() => {
            const remainingTimeR = Math.ceil((cooldownEndR - Date.now()) / 1000);
            const cooldownTimer = document.getElementById('cooldown-timer');

            if (remainingTimeR > 0) {
                cooldownTimer.textContent = `Resend available in ${remainingTimeR} seconds.`;
            } else {
                clearInterval(window.cooldownInterval);
                cooldownTimer.textContent = '';
                localStorage.removeItem('cooldownEndR');
                resendEmail.disabled = false;
            }
        }, 1000);
    }
});

function showError(message, type = 'fail') { // Default parameter for common use case
    const container = document.getElementById('error-container');
    container.innerHTML = '';
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
    if (type === 'neutral') { //  Apply different styles based on type
        errorMessage.style.color = 'white';
        errorMessage.style.border = 'white';
    }
}

// Load all counters from local storage, so values don't change even if user refreshes/closes window
let resendAttemptsU = parseInt(localStorage.getItem('resendAttemptsR')) || 0;
let resendCooldownR = parseInt(localStorage.getItem('resendCooldownR')) || 0;

const verifyCode = document.getElementById('resetPassword');
if (verifyCode) {
    verifyCode.addEventListener('submit', async (event) => {
        event.preventDefault(); 
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
                showError(verificationResult.message, 'neutral')
                setTimeout(() => { // Redirect to password reset page after 4 seconds if verification successful
                    window.location.replace('passwordreset.html');
                }, 4000);
            } else {
                showError(verificationResult.message)
            }

        } catch (error) {
            console.error('Error verifying code:', error);
            showError('Failed to verify code');
        }
    });
}

const resendEmail = document.getElementById('resend-button');
if (resendEmail) {
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
                resendAttemptsR++;
                resendCooldownR = resendAttemptsU >= 3 ? 3600 : 60; // 1 hour cooldown if 3 or more attempts, 1 minute if less
                localStorage.setItem('resendAttemptsR', resendAttemptsR);
                localStorage.setItem('resendCooldownR', resendCooldownR);
                const cooldownEndR = Date.now() + resendCooldownR * 1000;
                localStorage.setItem('cooldownEndR', cooldownEndR);
                resendEmail.disabled = true; // Prevent user from using resend button during cooldown

                if (window.cooldownInterval) { // Clear existing cooldowns to prevent multiple cooldowns
                    clearInterval(window.cooldownInterval);
                }

                window.cooldownInterval = setInterval(() => {
                    const remainingTimeR = Math.ceil((cooldownEndR - Date.now()) / 1000);
                    const cooldownTimer = document.getElementById('cooldown-timer');
        
                    if (remainingTimeR > 0) { // Display cooldown
                        cooldownTimer.textContent = `Resend available in ${remainingTimeR} seconds.`;
                    } else { // Clear interval when cooldown ends and re-enable resend button
                        clearInterval(window.cooldownInterval); 
                        cooldownTimer.textContent = ''; 
                        localStorage.removeItem('cooldownEndR'); 
                        resendEmail.disabled = false; 
                    }
                }, 1000);
            } else {
                showError('Failed to resend verification email');
            }
        } catch (error) {
            console.error('Error resending verification email:', error);
            showError('Failed to resend verification email');
        }
    });
}

const resetPassword = document.getElementById('resetForm');
if (resetPassword) {
    resetPassword.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('Create-password').value.trim();
        const confirmPassword = document.getElementById('Confirm-password').value.trim();

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        try { // Reset password
            const resetResponse = await fetch(`${baseUrl}/api/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, type: 'login' })
            });

            const resetResult = await resetResponse.json();

            if (resetResult.success) { // Redirect to login page after 4 seconds if password reset successful
                showError('Password reset successful', 'neutral');
                setTimeout(() => {
                    window.location.replace('adminlogin.html');
                }, 4000);
            } else {
                resetResult.errors.forEach(error => showError(error));
            }

        } catch (error) {
            console.error('Error resetting password:', error);
            showError('Failed to reset password');
        }
    });
}