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

function expand(admin, button) { // Display full details when expand button clicked
    adminRow = button.closest('.admin-row');
    admin = JSON.parse(adminRow.dataset.admin);
    adminRow.innerHTML = `
    <h5>ID: ${admin.adminID}</h5>
    <h4>Name: ${admin.forename} ${admin.surname}</h4>
    <p>Email address: ${admin.email}</p>
    <p>Phone number: ${admin.phone}</p>
    <button class="minimise-button" onclick="minimise(${admin.adminID}, this)">Minimise</button>
    <button class="edit-button" onclick="edit(${admin.adminID}, this)">Edit</button>
    <button class="delete-button" onclick="deleteAdmin(${admin.adminID}, this)">Delete admin</button>
`;
}

function minimise(admin, button) { // Only display basic details when minimise button clicked
    adminRow = button.closest('.admin-row');
    admin = JSON.parse(adminRow.dataset.admin);
    adminRow.innerHTML = `
    <h5>ID: ${admin.adminID}</h5>
    <h4>Name: ${admin.forename} ${admin.surname}</h4>
    <button class="expand-button" onclick="expand(${admin.adminID}, this)">Expand</button>
`;
}

function deleteAdmin(admin, button) { // Delete admin when delete admin button clicked
    adminRow = button.closest('.admin-row');
    admin = JSON.parse(adminRow.dataset.admin);
    adminID = admin.adminID;

    // Confirm deletion using built-in browser alert before proceeding
    if (!confirm('Are you sure you want to delete this admin?')) {
        return;
    }

    const response = fetch(`${baseUrl}/api/delete-user`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin', userId: adminID }),
    });
    const result = response.json();
    if (result.success) {
        showError(result.message, 'neutral');
        adminRow.remove();
    } else {
        showError(result.error);
    }
}

function edit(admin, button) { // Display forms to update details when edit button clicked
    adminRow = button.closest('.admin-row');
    admin = JSON.parse(adminRow.dataset.admin);
    let adminID = admin.adminID;
    adminRow.innerHTML = `
        <h5>ID: ${adminID}</h5>
        <form id="updateForename-${adminID}" class="form" method="post">
            <label for="forename" class="field-label">Forename</label>
            <input class="text-field" maxlength="20" name="forename" placeholder="Enter a new forename, up to 20 characters" type="text" id="forename-${adminID}" required=""/>
            <input type="submit" class="submit-button" value="Update forename"/>
        </form>
        <form id="updateSurname-${adminID}" class="form" method="post">
            <label for="surname" class="field-label">Surname</label>
            <input class="text-field" maxlength="20" name="surname" placeholder="Enter a new surname, up to 20 characters" type="text" id="surname-${adminID}" required=""/>
            <input type="submit" class="submit-button" value="Update surname"/>
        </form>
        <form id="updateEmail-${adminID}" class="form" method="post">
            <label for="email" class="field-label">Email address</label>
            <input class="text-field" maxlength="320" name="email" placeholder="Enter a new email address" type="email" id="email-${adminID}" required=""/>
            <input type="submit" class="submit-button" value="Update email address"/>
        </form>
        <form id="updatePhone-${adminID}" class="form" method="post">
            <label for="phone" class="field-label">Phone number</label>
            <input class="text-field" maxlength="11" name="phone" placeholder="Enter a new phone number" type="tel" id="phone-${adminID}" required=""/>
            <input type="submit" class="submit-button" value="Update phone number"/>
        </form>
        <button class="minimise-button" onclick="minimise(${adminID}, this)">Minimise</button>
        <button class="delete-button" onclick="deleteAdmin(${adminID}, this)">Delete admin</button>
    `;

    // Call detail update APIs
    document.getElementById(`updateForename-${adminID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const forename = document.getElementById(`forename-${adminID}`).value.trim();
        adminID = admin.adminID;
        const response = await fetch(`${baseUrl}/api/update-forename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ forename, userId: adminID }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
        } else {
            result.errors.forEach(error => showError(error));
        }
    });

    document.getElementById(`updateSurname-${adminID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const surname = document.getElementById(`surname-${adminID}`).value.trim();
        adminID = admin.adminID;
        const response = await fetch(`${baseUrl}/api/update-surname`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ surname, userId: adminID }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
        } else {
            result.errors.forEach(error => showError(error));
        }
    });

    document.getElementById(`updateEmail-${adminID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById(`email-${adminID}`).value.trim();
        adminID = admin.adminID;
        const emailResponse = await fetch(`${baseUrl}/api/email-code`, { // Send verification email
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, type: 'email' }),
        });
        const emailResult = await emailResponse.json();

        if (emailResult.success) {
            const unverifyResponse = await fetch(`${baseUrl}/api/unverify-user`, { // Unverify user to trigger verification upon login
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: 'admin', userId: adminID }),
            });
            const unverifyResult = await unverifyResponse.json();

            if (unverifyResult.success) { 
                const updateResponse = await fetch(`${baseUrl}/api/update-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, role: 'admin', userId: adminID }),
                });
                const updateResult = await updateResponse.json();

                if (updateResult.success) {
                    showError(updateResult.message, 'neutral');
                } else {
                    updateResult.errors.forEach(error => showError(error));
                }
            }
        } else {
            emailResult.errors.forEach(error => showError(error));
        }
    });

    document.getElementById(`updatePhone-${adminID}`).addEventListener('submit', async (event) => {
        event.preventDefault();
        const phone = document.getElementById(`phone-${adminID}`).value.trim();
        adminID = admin.adminID;
        const response = await fetch(`${baseUrl}/api/update-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, userId: adminID }),
        });
        const result = await response.json();
        if (result.success) {
            showError(result.message, 'neutral');
        } else {
            result.errors.forEach(error => showError(error));
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/get-users`, { // Fetch all admins from in-memory array
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'admin' }),
        });
        const result = await response.json();

        for (let admin of result.users) { // Display basic details for each admin
            let adminRow = document.createElement('div');
            adminRow.className = 'admin-row';
            adminRow.dataset.admin = JSON.stringify(admin);
            adminRow.innerHTML = `
                <h5>ID: ${admin.adminID}</h5>
                <h4>Name: ${admin.forename} ${admin.surname}</h4>
                <button class="expand-button" onclick="expand(${admin.adminID}, this)">Expand</button>
            `;
            document.getElementById('admin-container').appendChild(adminRow);
        }
    } catch {
        showError('Error fetching admins');
    }
});