
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
    console.log('Form data:', { forename, surname, email, phone, password });

    // Validation
    if (password !== confirmPassword) { 
        alert('Passwords do not match');
        return;
    } 

    try {
        // Send data to backend to create administrator account
        const adminData = { forename, surname, email, phone, password };
        const response = await window.api.invoke('create-admin', adminData);
        
        if (response.success) {
            alert('Administrator account created successfully');
            window.location.reload(); // Reload page to launch startup
        } else {
            console.error('Error response:', response.message);
            alert(`Failed to create administrator account: ${response.message}`);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        alert('Failed to create administrator account');
    }
});






