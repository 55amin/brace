const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

function expand(task, button) { // Display full details when expand button clicked
    let taskRow = button.closest('.task-row');
    task = JSON.parse(taskRow.dataset.task);
    taskRow.innerHTML = `
    <h5>ID: ${task.taskID}</h5>
    <h4>Title: ${task.title}</h4>
    <h4 style="font-style: italic;">${task.status}</h4>
    <p>Description: ${task.desc}</p>
    <p>Creation date: ${task.creationDate}</p>
    <p>Deadline: ${task.deadline}</p>
    <p>Assigned to: ${task.assignedTo.join(', ')}</p>
    <button class="minimise-button" onclick="minimise(${task.taskID}, this)">Minimise</button>
    <button class="edit-button" onclick="edit(${task.taskID}, this)">Edit</button>
    <button class="delete-button" onclick="deleteTask(${task.taskID}, this)">Delete task</button>
`;
}

function minimise(task, button) { // Only display basic details when minimise button clicked
    let taskRow = button.closest('.task-row');
    task = JSON.parse(taskRow.dataset.task);
    taskRow.innerHTML = `
    <h5>ID: ${task.taskID}</h5>
    <h4>Title: ${task.title}</h4>
    <h4 style="font-style: italic;">${task.status}</h4>
    <button class="expand-button" onclick="expand(${task.taskID}, this)">Expand</button>
`;
}

async function deleteTask(task, button) { // Delete task when delete task button clicked
    let taskRow = button.closest('.task-row');
    task = JSON.parse(taskRow.dataset.task);
    let taskID = task.taskID;

    // Confirm deletion using built-in browser alert before proceeding
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    const response = await fetch(`${baseUrl}/api/delete-task`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: taskID }),
    });
    const result = await response.json();

    if (result.success) {
        showError(result.message, 'neutral');
        taskRow.remove();
    } else {
        showError(result.error);
    }
}

function edit(task, button) { // Display forms to update details when edit button clicked
    let taskRow = button.closest('.task-row');
    task = JSON.parse(taskRow.dataset.task);
    let taskID = task.taskID;
    taskRow.innerHTML = `
        <h5>ID: ${taskID}</h5>
        <form id="updateUsername-${taskID}" class="form" method="post">
            <label for="username" class="field-label">Username</label>
            <input class="text-field" maxlength="20" name="username" placeholder="Enter a new, unique username, up to 20 characters, containing only letters, numbers and underscores" type="text" id="username-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update username"/>
        </form>
        <form id="updateEmail-${taskID}" class="form" method="post">
            <label for="email" class="field-label">Email address</label>
            <input class="text-field" maxlength="320" name="email" placeholder="Enter a new email address" type="email" id="email-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update email address"/>
        </form>
        <form id="updateAccess-${taskID}" class="form" method="post">
            <label for="accessLevel" class="field-label">Access level</label>
            <select id="access-${taskID}" name="accessLevel" required="">
                <option value="" disabled selected>Select access level</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
            </select>
            <input type="submit" class="submit-button" value="Update access level"/>
        </form>
        <form id=updateHours-${taskID} class="form" method="post">
            <label for="workingHours" class="field-label">Set working hours</label>
            <div id="workingHours"></div>
            <input type="submit" class="submit-button" value="Update working hours"/>
        </form>
        <form id="updateSpecialties-${taskID}" class="form" method="post">
            <label for="specialties" class="field-label">Specialties</label>
            <select id="specialties-${taskID}" name="specialties" multiple required="">
                <option value="" disabled selected>Select one or more specialties</option>
                <option value="PC/laptop hardware specialist">PC/laptop hardware specialist</option>
                <option value="Mobile phone hardware specialist">Mobile phone hardware specialist</option>
                <option value="Network specialist">Network specialist</option>
                <option value="Windows specialist">Windows specialist</option>
                <option value="MacOS specialist">MacOS specialist</option>
                <option value="Android/iOS specialist">Android/iOS specialist</option>
                <option value="Application specialist">Application specialist</option>
            </select>
            <input type="submit" class="submit-button" value="Update specialties"/>
        </form>
        <form id="updatePassword-${taskID}" class="form" method="post">
            <label for="password" class="field-label-2">Create password</label>
            <input class="text-field-2" maxlength="20" name="password" placeholder="Create a new password with at least 8 characters, including at least one number, one uppercase letter, one lowercase character and a special character" type="password" id="password-${taskID}" required=""/>
            <label for="confirmPassword" class="field-label-2">Confirm password</label>
            <input class="text-field-2" maxlength="20" name="confirmPassword" placeholder="Both passwords must match" type="password" id="confirmPassword-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update password"/>
        </form>
        <button class="minimise-button" onclick="minimise(${taskID}, this)">Minimise</button>
        <button class="delete-button" onclick="deleteTask(${taskID}, this)">Delete task</button>
    `;

    // Call detail update APIs
    
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${baseUrl}/api/get-tasks`, { // Fetch all tasks from in-memory array
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const result = await response.json();

        for (let task of result.taskArr) { // Display basic details for each task
            let taskRow = document.createElement('div');
            taskRow.className = 'task-row';
            taskRow.dataset.task = JSON.stringify(task); // Store task object in element's dataset to be accessed by other functions
            taskRow.innerHTML = `
                <h5>ID: ${task.taskID}</h5>
                <h4>Title: ${task.title}</h4>
                <h4 style="font-style: italic;">${task.status}</h4>
                <button class="expand-button" onclick="expand(${task.taskID}, this)">Expand</button>
            `;
            document.getElementById('task-container').appendChild(taskRow);
        }
    } catch {
        showError('Error fetching tasks');
    }
});

window.expand = expand;
window.minimise = minimise;
window.deleteTask = deleteTask;
window.edit = edit;