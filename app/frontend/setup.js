const setupForm = document.getElementById('setupForm');

setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Data collection
    const forename = document.getElementById('forename').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    // Send data to backend
    const response = await window.api.send('create-admin', {
        forename,
        surname,
        email,
        phone,
        password
    });

    if (response.success) {
        alert('Administrator account created successfully');
        window.location.reload(); // Reload page to launch startup
    } else {
        alert('Failed to create administrator account: ' + response.message);
    }
});