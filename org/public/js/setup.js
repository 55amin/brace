const baseUrl = window.location.origin;
document.documentElement.style.visibility = 'hidden'; // Hide the form until the admin check is complete

fetch(`${baseUrl}/api/check-admin`)
    .then(response => response.json())
    .then(data => {
        if (data.exists) { // Redirect to startup page if an admin exists
            window.location.replace('index.html');
            return;
        }
        document.documentElement.style.visibility = 'visible';
    })
    .catch(error => {
        console.error('Failed to check for admin:', error);
        window.location.replace('index.html');
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

                if (emailResult.success) { // Update the screen's contents
                    document.body.innerHTML = `
                        <div class="header">
                            <img src="media/wrenchsetupw.png" class="setuplogo" alt="Setup"/>
                            <div class="header-left">
                                <img src="media/bracelogo.png" class="bracelogo" alt="Brace"/>
                                <h1 class="braceh1">RACE</h1>
                            </div>
                        </div>
                        <div class="verification-message">
                            <p>You have been sent an email containing a verification code.</p>
                            <p>Navigate to the admin login screen, then enter your details and the verification code to verify your account.</p>
                            <p>You will be redirected to the start-up screen in 20 seconds, or you can refresh the page to go there now.</p>
                        </div>
                    `;
                    setTimeout(() => { // Redirect to startup page after 20 seconds
                        window.location.replace('index.html');
                    }, 20000);
                } else {
                    document.body.innerHTML = `
                        <div class="header">
                            <img src="media/wrenchsetupw.png" class="setuplogo" alt="Setup"/>
                            <div class="header-left">
                                <img src="media/bracelogo.png" class="bracelogo" alt="Brace"/>
                                <h1 class="braceh1">RACE</h1>
                            </div>
                        </div>
                        <div id="error-container" class="error-container"></div>
                    `;
                    showError('Failed to send verification email.\nNavigate to the admin login screen, then enter your details and attempt to resend the email.\nYou will be redirected to the start-up screen in 20 seconds, or you can refresh the page to go there now.');
                    setTimeout(() => { 
                        window.location.replace('index.html');
                    }, 20000);
                }
            };

            await sendVerificationEmail();
        } else { // Show all validation errors
            result.errors.forEach(error => showError(error));
            submitButton.disabled = false;
        }
    } catch (err) {
        showError('Failed to create administrator account');
        submitButton.disabled = false;
    }
});