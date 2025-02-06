baseUrl = window.location.origin;

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

function expand(admin, adminRow) {
    admin = JSON.parse(adminRow.dataset.admin);
    adminRow.innerHTML = `
    <h5>ID: ${admin.adminID}</h5>
    <h4>Name: ${admin.forename} ${admin.surname}</h4>
    <p>Email address: ${admin.email}</p>
    <p>Phone number: ${admin.phone}</p>
    <button class="minimise-button" onclick="minimise(${admin.adminID}, ${adminRow})">Minimise</button>
    <button class="delete-button" onclick="deleteAdmin(${admin.adminID}, ${adminRow})">Delete admin</button>
`;
}

function minimise(admin, adminRow) {
    admin = JSON.parse(adminRow.dataset.admin);
    adminRow.innerHTML = `
    <h5>ID: ${admin.adminID}</h5>
    <h4>Name: ${admin.forename} ${admin.surname}</h4>
    <button class="expand-button" onclick="expand(${admin.adminID}, ${adminRow})">Expand</button>
`;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/get-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 'admin' }),
        });
        const result = await response.json();

        for (let admin of result.users) {
            let adminRow = document.createElement('div');
            adminRow.className = 'admin-row';
            adminRow.dataset.admin = JSON.stringify(admin);
            adminRow.innerHTML = `
                <h5>ID: ${admin.adminID}</h5>
                <h4>Name: ${admin.forename} ${admin.surname}</h4>
                <button class="expand-button" onclick="expand(${admin.adminID}, ${adminRow})">Expand</button>
            `;
            document.getElementById('admin-container').appendChild(adminRow);
        }
    } catch {
        showError('Error fetching admins');
    }
});