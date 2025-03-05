const baseUrl = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('send');

    async function fetchMessages() {
        try {
            const response = await fetch(`${baseUrl}/api/get-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(),
            });
            const result = await response.json();
    
            if (result.success) { // Display all messages, based on sender
                chatMessages.innerHTML = '';
                result.messages.forEach(message => {
                    const sender = message.agent_id ? agent : 'customer';
                    const messageElement = document.createElement('div');
                    messageElement.className = `message ${sender}`;
                    messageElement.innerHTML = `
                        <div class="message-header">
                            <span class="message-sender ${sender}">${sender}</span>
                            <span class="message-time ${sender}">${new Date(message.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p>${message.content}</p>
                    `;
                    chatMessagesContainer.appendChild(messageElement);
                });
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
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
    sendButton.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        try {
            const response = await fetch(`${baseUrl}/api/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sender: 'customer', message }),
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