const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';

async function checkAssign() {
    const userTicketsResponse = await fetch(`${baseUrl}/api/check-assign`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    }); // Check if user already assigned to ticket
    const userTicketsResult = await userTicketsResponse.json();
    userTickets = userTicketsResult.userTickets;
}

document.addEventListener('DOMContentLoaded', async () => {
    let tickets = [];
    let userTickets = [];
    try { // Fetch tickets from in-memory array
        const ticketsResponse = await fetch(`${baseUrl}/api/get-tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const ticketsResult = await ticketsResponse.json();
        tickets = ticketsResult.ticketArr;

        await checkAssign();
    } catch (error) {
        showError('Failed to fetch tickets');
        console.error('Error fetching tickets:', error);
    }

    const calendar = document.getElementById('calendar');
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [ 
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthYear = document.getElementById('month-year');
    monthYear.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    daysOfWeek.forEach(day => {  
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

    for (let i = 1; i <= daysInMonth; i++) { 
        const day = document.createElement('div');
        day.className = 'day';
        day.innerText = i;
        if (i === currentDay) { // Highlight current day
            day.classList.add('current-day');
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

            ticketsForDay.forEach(ticket => { // Display expanded details for each ticket created on day
                const ticketCreation = new Date(ticket.creationDate).toLocaleString();
                const ticketDeadline = new Date(ticket.deadline).toLocaleString();
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
                    <p>Creation date: ${ticketCreation} || Deadline: ${ticketDeadline}</p>
                    <p>Customer ID: ${ticket.customerID} || Customer username: ${ticket.customerUsername}</p>
                    <p>Customer email address: ${ticket.customerEmail}</p>
                    <button class="self-assign">Self-assign ticket</button>
                `; 

                const selfAssign = ticketBox.querySelector('.self-assign');
                // Prevent assigned tickets from being reassigned or taken by assigned user
                if (ticket.status === 'In progress' || userTickets.length > 0) {
                    selfAssign.disabled = true;
                    selfAssign.style.backgroundColor = '#3b505e';
                }

                expansionContainer.appendChild(ticketBox);
            });
        });

        calendar.appendChild(day);
    }

    const dropdownMenu = document.getElementById('dropdown-menu');
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