const baseUrl = window.location.origin;
import { showError } from '../helpers/showError.js';
const socket = io(baseUrl);

function displayMessage(message) { // Display message with sender and time
    const sender = message.agent_id ? 'Agent' : 'Customer';
    const messageRow = document.createElement('div');
    messageRow.className = `message ${sender.toLowerCase()}`;
    messageRow.innerHTML = `
        <div class="message-header">
            <span class="message-sender ${sender.toLowerCase()}">${sender}</span>
            <span class="message-time ${sender.toLowerCase()}">${new Date(message.created_at).toLocaleString()}</span>
        </div>
        <p>${message.message}</p>
    `;
    chatMessages.appendChild(messageRow);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    let ticketID;
    const backButton = document.getElementById('backChat');
    let role;
    
    try {
        const response = await fetch(`${baseUrl}/api/get-role`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const result = await response.json();

        if (result.admin) {
            role = 'admin';
            backButton.href = '../admin/adminscreen.html';
        } else if (result.agent) {
            role = 'agent';
            backButton.href = '../agent/agentscreen.html';
        }
    } catch (error) {
        return;
    }

    try { // Add agent to chatroom
        const response = await fetch(`${baseUrl}/api/create-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const result = await response.json();
        
        if (result.success) {
            console.log(result.message);
            ticketID = result.ticketID;
            socket.emit('joinRoom', ticketID); // Send joinRoom event to server
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error('Error creating chatroom:', error);
        alert('Failed to create chatroom');
    }

    socket.emit('fetchMessages', ticketID); // Send fetchMessages event to server

    socket.on('receiveMessages', (messages) => { // Load all messages when joining chat
        chatMessages.innerHTML = ''; // Clear existing messages
        messages.forEach(message => {
            displayMessage(message);
        });
    });

    socket.on('receiveMessage', (message) => { // Load new messages
        displayMessage(message);
    });
    
    chatInput.addEventListener('submit', async (event) => { // Send a message
        event.preventDefault();
        const message = document.getElementById('newMessage').value.trim();
        if (!message) return;

        try {
            const response = await fetch(`${baseUrl}/api/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            const result = await response.json();

            if (result.success) {
                document.getElementById('newMessage').value = '';
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    });

    const optionContainer = document.getElementById('option-container');
    const options = document.getElementById('options');
    const viewDetails = document.getElementById('details');
    const triageTicket = document.getElementById('triage');
    const closeTicket = document.getElementById('close');
    const dropTicket = document.getElementById('drop');
    const minimise = document.getElementById('exit');

    options.addEventListener('click', () => { // Open the options menu
        optionContainer.style.display = 'flex';
    });

    viewDetails.addEventListener('click', async () => {
        try {
            const ticketBox = document.querySelector('.ticket-box');
            if (!ticketBox) { // Prevent multiple ticket boxes from being created
                const response = await fetch(`${baseUrl}/api/get-ticket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                const result = await response.json();
                
                if (result.success) { // Display ticket details
                    const ticket = result.ticketObj;
                    const triaged = ticket.triage ? 'Yes' : 'No';
                    const ticketCreation = new Date(ticket.creationDate).toLocaleString();
                    const ticketDeadline = new Date(ticket.deadline).toLocaleString();
                    const ticketBox = document.createElement('div');
                    ticketBox.className = 'ticket-box';
                    ticketBox.innerHTML = `
                        <p>Ticket ID: ${ticket.ticketID}</p>
                        <p>Status: ${ticket.status} || Triaged: ${triaged}</p>
                        <p>Title: ${ticket.title}</p>
                        <p>Description: ${ticket.desc}</p>
                        <p>Type: ${ticket.type}</p>
                        <p>Priority: ${ticket.priority}</p>
                        <p>Creation date: ${ticketCreation} || Deadline: ${ticketDeadline}</p>
                        <p>Customer ID: ${ticket.customerID} || Customer username: ${ticket.customerUsername}</p>
                        <p>Customer email address: ${ticket.customerEmail}</p>
                    `;
                    optionContainer.appendChild(ticketBox);
                } else {
                    showError(result.message);
                }
            }
        } catch (error) {
            console.error('Error fetching ticket details:', error);
            showError('Failed to fetch ticket details');
        }
    });

    triageTicket.addEventListener('click', async () => {
        try { // Triage and drop ticket
            const response = await fetch(`${baseUrl}/api/triage-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
            
            if (result.success) {
                showError(result.message, 'neutral');
                setTimeout(async () => { // Redirect user back to main screen after 3 seconds
                    if (role === 'agent') {
                        window.location.href = '../agent/agentscreen.html';
                    } else if (role === 'admin') {
                        window.location.href = '../admin/adminscreen.html';
                    }
                }, 3000);
            } else {
                showError(result.message);
            }
        } catch (error) {
            console.error('Error triaging ticket:', error);
            showError('Failed to triage ticket');
        }
    });

    closeTicket.addEventListener('click', async () => {
        try { // Close ticket and notify customer
            const response = await fetch(`${baseUrl}/api/close-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
            
            if (result.success) {
                showError(result.message, 'neutral');
                setTimeout(async () => {
                    if (role === 'agent') { // Redirect user back to main screen after 3 seconds
                        window.location.href = '../agent/agentscreen.html';
                    } else if (role === 'admin') {
                        window.location.href = '../admin/adminscreen.html';
                    }
                }, 3000);
            } else {
                showError(result.message);
            }
        } catch (error) {
            console.error('Error closing ticket:', error);
            showError('Failed to close ticket');
        }
    });

    dropTicket.addEventListener('click', async () => {
        try { // Drop ticket
            const response = await fetch(`${baseUrl}/api/drop-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
            
            if (result.success) {
                showError(result.message, 'neutral');
                setTimeout(async () => {
                    if (role === 'agent') { // Redirect user back to main screen after 3 seconds
                        window.location.href = '../agent/agentscreen.html';
                    } else if (role === 'admin') {
                        window.location.href = '../admin/adminscreen.html';
                    }
                }, 3000);
            } else {
                showError(result.message);
            }
        } catch (error) {
            console.error('Error dropping ticket:', error);
            showError('Failed to drop ticket');
        }
    });

    minimise.addEventListener('click', () => { // Minimise the options menu
        optionContainer.style.display = 'none';
    });
});
