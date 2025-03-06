const baseUrl = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');

    async function fetchMessages() {
        try {
            const response = await fetch(`${baseUrl}/api/get-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
    
            if (result.success) { // Display all messages
                chatMessages.innerHTML = '';
                result.messages.forEach(message => { // Check who sent message
                    const sender = message.agent_id ? 'Agent' : 'Customer';
                    const messageRow = document.createElement('div');
                    messageRow.className = `message ${sender}`;
                    messageRow.innerHTML = `
                        <div class="message-header">
                            <span class="message-sender ${sender}">${sender}</span>
                            <span class="message-time ${sender}">${new Date(message.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p>${message.message}</p>
                    `;
                    chatMessages.appendChild(messageRow);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            alert('Failed to fetch messages');
        }
    }

    window.addEventListener('load', async () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await fetchMessages();
    });
    
    // Send a message
    chatInput.addEventListener('submit', async (event) => {
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
                chatInput.value = '';
                await fetchMessages();
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    });
});
