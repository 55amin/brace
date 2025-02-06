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
    adminRow.innerHTML = `
    <h5>${admin.adminID}</h5>
    <h4>${admin.forename} ${admin.surname}</h4>
    <p>${admin.email}</p>
    <p>${admin.phone}</p>
    <button class="minimise-button" onclick="minimise(${JSON.stringify(admin)}, adminRow)">Minimise</button>
    <button class="delete-button" onclick="deleteAdmin(${JSON.stringify(admin)}, adminRow)">Delete admin</button>
`;
}

function minimise(admin, adminRow) {
    adminRow.innerHTML = `
    <h5>${admin.adminID}</h5>
    <h4>${admin.forename} ${admin.surname}</h4>
    <button class="expand-button" onclick="expand(${JSON.stringify(admin)}, adminRow)">Expand</button>
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
            adminRow.innerHTML = `
                <h5>${admin.adminID}</h5>
                <h4>${admin.forename} ${admin.surname}</h4>
                <button class="expand-button" onclick="expand(${JSON.stringify(admin)}, adminRow)">Expand</button>
            `;
            document.getElementById('admin-container').appendChild(adminRow);
        }
    } catch {
        showError('Error fetching admins');
    }
});