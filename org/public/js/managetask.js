const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

function expand(task, button) { // Display full details when expand button clicked
    let taskRow = button.closest('.task-row');
    task = JSON.parse(taskRow.dataset.task);

    // Format date based on user's local conventions 
    const creationDate = new Date(task.creationDate).toLocaleString();
    const deadline = new Date(task.deadline).toLocaleString();

    taskRow.innerHTML = `
    <h5>ID: ${task.taskID}</h5>
    <h4>Title: ${task.title}</h4>
    <h4 style="font-style: italic;">${task.status}</h4>
    <p>Description: ${task.desc}</p>
    <p>Creation date: ${creationDate}</p>
    <p>Creator: ${task.creator}<p>
    <p>Deadline: ${deadline}</p>
    <p>Assigned to: ${task.assignedTo}</p>
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
        <form id="updateTitle-${taskID}" class="form" method="post">
            <label for="title" class="field-label">Title</label>
            <input class="text-field" maxlength="100" name="title" placeholder="Enter a new title, up to 100 characters" type="text" id="title-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update title"/>
        </form>
        <form id="updateDesc-${taskID}" class="form" method="post">
            <label for="description" class="field-label">description</label>
            <textarea class="text-field" maxlength="100" name="description" placeholder="Enter a new title, up to 100 characters" type="text" id="desc-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update description"/>
        </form>
        <form id="updateDeadline-${taskID}" class="form" method="post">
            <label for="deadline" class="field-label">Deadline</label>
            <input name="deadline" type="datetime-local" id="deadline-${taskID}" required=""/>
            <input type="submit" class="submit-button" value="Update deadline"/>
        </form>
        <form id="updateAssign-${taskID}" class="form" method="post">
            <label for="assignedTo" class="field-label">Assign to:</label>
            <div id="agent-container-${taskID}"></div>
            <input type="submit" class="submit-button" value="Update assigned agents"/>
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