function showError(message) {
    const container = document.getElementById('error-container');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
}

window.api.receive('show-error', (message) => {
    showError(message);
});

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
    console.log('Form data:', { forename, surname, email, phone, password });

    // Validation
    if (password !== confirmPassword) { 
        showError('Passwords do not match');
        return;
    } 

    try { // Send data to backend to create administrator account
        const adminData = { forename, surname, email, phone, password };
        const response = await window.api.invoke('create-admin', adminData);
        
        if (response.success) {
            window.location.href = 'index.html'; // Redirect user to start-up screen
        }
    } catch (err) {
        showError('Failed to create administrator account');
    }
});






