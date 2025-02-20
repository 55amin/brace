const baseUrl = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('calendar');
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

    const tickets = [
        { day: 5, text: 'T-20241205-009' },
        { day: 9, text: 'T-20241209-005' },
        { day: 10, text: 'T-20241210-033' },
        { day: 15, text: 'T-20241215-012' },
        { day: 18, text: 'T-20241218-004' },
        { day: 23, text: 'T-20241223-027' }
    ];

    for (let i = 1; i <= daysInMonth; i++) { // Create days in calendar
        const day = document.createElement('div');
        day.className = 'day';
        day.innerText = i;
        if (i === currentDay) { // Highlight current day
            day.classList.add('current-day');
        }

        tickets.forEach(ticket => {
            if (ticket.day === i) {
                const ticketElement = document.createElement('div');
                ticketElement.className = 'ticket';
                ticketElement.innerText = ticket.text;
                day.appendChild(ticketElement);
            }
        });

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

    viewToggle.addEventListener('change', (event) => {
        if (event.target.checked) {
            calendarContainer.style.display = 'none';
            dropdownContainer.style.display = 'block';
        } else {
            calendarContainer.style.display = 'block';
            dropdownContainer.style.display = 'none';
        }
    });
});