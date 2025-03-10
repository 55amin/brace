const baseUrl = window.location.origin;
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
    try {
        const response = await fetch(`${baseUrl}/api/get-role`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const result = await response.json();

        if (result.admin) {
            backButton.href = '../admin/adminscreen.html';
        } else if (result.agent) {
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
    const extendDuration = document.getElementById('extend');
    const closeTicket = document.getElementById('close');
    const minimise = document.getElementById('exit');

    options.addEventListener('click', () => {
        optionContainer.style.display = 'flex';
    });

    viewDetails.addEventListener('click', async () => {
        
    });

    triageTicket.addEventListener('click', async () => {
        
    });

    extendDuration.addEventListener('click', async () => {
        
    });

    closeTicket.addEventListener('click', async () => {
        
    });

    minimise.addEventListener('click', () => {
        optionContainer.style.display = 'none';
    });
});
