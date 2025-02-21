const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

document.addEventListener('DOMContentLoaded', async () => {
    let tasks = [];
    let tickets = [];
    try { // Fetch tasks and tickets from in-memory arrays
        const tasksResponse = await fetch(`${baseUrl}/api/get-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const tasksResult = await tasksResponse.json();
        tasks = tasksResult.taskArr;

        const ticketsResponse = await fetch(`${baseUrl}/api/get-tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const ticketsResult = await ticketsResponse.json();
        tickets = ticketsResult.ticketArr;
    } catch (error) {
        showError('Failed to fetch tasks and/or tickets');
        console.error('Error fetching tasks and/or tickets:', error);
    }

    const calendar = document.getElementById('calendar');
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [ // Create month and year heading
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthYear = document.getElementById('month-year');
    monthYear.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    daysOfWeek.forEach(day => {  // Create headings for days
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day day-header';
        dayHeader.innerText = day;
        calendar.appendChild(dayHeader);
    });

    for (let i = 0; i < firstDay; i++) { // Create empty slots for days before month start
        const emptySlot = document.createElement('div');
        emptySlot.className = 'day empty';
        calendar.appendChild(emptySlot);
    }

    for (let i = 1; i <= daysInMonth; i++) { // Create days in calendar
        const day = document.createElement('div');
        day.className = 'day';
        day.innerText = i;
        if (i === currentDay) { // Highlight current day
            day.classList.add('current-day');
        }

        const tasksForDay = tasks.filter(task => new Date(task.deadline).getDate() === i);
        if (tasksForDay.length > 0) { // Create colored dot with number of tasks
            const taskDot = document.createElement('div');
            taskDot.className = 'task-dot';
            taskDot.innerText = tasksForDay.length;
            day.appendChild(taskDot);
        }

        const ticketsForDay = tickets.filter(ticket => new Date(ticket.creationDate).getDate() === i);
        if (ticketsForDay.length > 0) { // Create colored dot with number of tickets
            const ticketDot = document.createElement('div');
            ticketDot.className = 'ticket-dot';
            ticketDot.innerText = ticketsForDay.length;
            const highestPriority = Math.max(...ticketsForDay.map(ticket => ticket.priority));
            if (highestPriority === 1) {
                ticketDot.style.backgroundColor = 'yellow';
                ticketDot.style.color = 'black';
            } else if (highestPriority === 2) {
                ticketDot.style.backgroundColor = 'orange';
            } else if (highestPriority === 3) {
                ticketDot.style.backgroundColor = 'red';
            }
            day.appendChild(ticketDot);
        }

        day.addEventListener('click', () => {
            const expansionContainer = document.getElementById('expansionContainer');
            expansionContainer.innerHTML = '';

            tasksForDay.forEach(task => { // Display expanded details for each task due on day
                const taskBox = document.createElement('div');
                taskBox.className = 'task-box';
                taskBox.innerHTML = `
                    <p>Task ID: ${task.taskID}</p>
                    <p>Status: ${task.status}</p>
                    <p>Title: ${task.title}</p>
                    <p>Description: ${task.desc}</p>
                    <p>Creation date: ${task.creationDate} || Deadline: ${task.deadline}</p>
                    <p>Creator: ${task.creator}</p>
                    <button class="complete-task">Complete task</button>
                `;
                expansionContainer.appendChild(taskBox);
            });

            ticketsForDay.forEach(ticket => { // Display expanded details for each ticket created on day
                if (ticket.triage) {
                    ticket.triage = 'Yes';
                } else {
                    ticket.triage = 'No';
                }

                const ticketBox = document.createElement('div');
                ticketBox.className = 'ticket-box';
                ticketBox.innerHTML = `
                    <p>Ticket ID: ${ticket.ticketID}</p>
                    <p>Status: ${ticket.status} || Triaged: ${ticket.triage}</p>
                    <p>Title: ${ticket.title}</p>
                    <p>Description: ${ticket.desc}</p>
                    <p>Type: ${ticket.type}</p>
                    <p>Priority: ${ticket.priority}</p>
                    <p>Creation date: ${ticket.creationDate} || Deadline: ${ticket.deadline}</p>
                    <p>Customer ID: ${ticket.creatorID} || Customer username: ${ticket.creatorUsername}</p>
                    <p>Customer email address: ${ticket.creatorEmail}</p>
                    <button class="self-assign">Self-assign ticket</button>
                `; 

                const selfAssign = ticketBox.querySelector('.self-assign');
                // Prevent assigned tickets from being reassigned or taken by assigned user
                if (ticket.status === 'In progress') {
                    selfAssign.disabled = true;
                    selfAssign.style.backgroundColor = '#3b505e';
                }

                expansionContainer.appendChild(ticketBox);
            });
        });

        calendar.appendChild(day);
    }

    const dropdownMenu = document.getElementById('dropdown-menu');
    tasks.forEach(task => { // Add tasks to dropdown menu
        const option = document.createElement('option');
        option.value = `Task ${task.taskID}: ${task.title}`;
        option.innerText = `Task ${task.taskID}: ${task.title}`;
        option.style.backgroundColor = '#009d00';
        option.style.color = 'black';
        dropdownMenu.appendChild(option);
    });

    tickets.forEach(ticket => { // Add tickets to dropdown menu
        const option = document.createElement('option');
        option.value = `Ticket ${ticket.ticketID}: ${ticket.title}`;
        option.innerText = `Ticket ${ticket.ticketID}: ${ticket.title}`;
        if (ticket.priority === 1) {
            option.style.backgroundColor = 'yellow';
            option.style.color = 'black';
        } else if (ticket.priority === 2) {
            option.style.backgroundColor = 'orange';
            option.style.color = 'black';
        } else if (ticket.priority === 3) {
            option.style.backgroundColor = 'red';
            option.style.color = 'black';
        }
        dropdownMenu.appendChild(option);
    });

    const viewToggle = document.getElementById('viewToggle');
    const calendarContainer = document.getElementById('calendarContainer');
    const dropdownContainer = document.getElementById('dropdownContainer');

    viewToggle.addEventListener('change', (event) => { // Display different view based on toggle
        if (event.target.checked) {
            calendarContainer.style.display = 'none';
            dropdownContainer.style.display = 'block';
        } else {
            calendarContainer.style.display = 'block';
            dropdownContainer.style.display = 'none';
        }
    });
});