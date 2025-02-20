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
        if (tasksForDay.length > 0) {
            const taskDot = document.createElement('div');
            taskDot.className = 'task-dot';
            taskDot.innerText = tasksForDay.length;
            day.appendChild(taskDot);
        }

        const ticketsForDay = tickets.filter(ticket => new Date(ticket.deadline).getDate() === i);
        if (ticketsForDay.length > 0) {
            const ticketDot = document.createElement('div');
            ticketDot.className = 'ticket-dot';
            ticketDot.innerText = ticketsForDay.length;
            const highestPriority = Math.max(...ticketsForDay.map(ticket => ticket.priority));
            if (highestPriority === 1) {
                ticketDot.style.backgroundColor = 'yellow';
            } else if (highestPriority === 2) {
                ticketDot.style.backgroundColor = 'orange';
            } else if (highestPriority === 3) {
                ticketDot.style.backgroundColor = 'red';
            }
            day.appendChild(ticketDot);
        }

        calendar.appendChild(day);
    }

    const dropdownMenu = document.getElementById('dropdown-menu');
    tickets.forEach(ticket => {
        const option = document.createElement('option');
        option.value = ticket.text;
        option.innerText = `Day ${ticket.day}: ${ticket.text}`;
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