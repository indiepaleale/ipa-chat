const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

// Display message history
socket.on('messageHistory', (history) => {
    history.forEach((msg) => {
        const item = document.createElement('li');
        item.textContent = msg.text;
        messages.appendChild(item);
    });
});

// Display new messages
socket.on('chatMessage', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg.text;
    if(!isScrolledToBottom()) {
        messages.appendChild(item);
    } else {
        messages.appendChild(item);
        scrollToBottom();
    }
});

document.addEventListener('DOMContentLoaded', (event) => {
    const inputField = document.getElementById('input');
    inputField.focus();

    // Keep the input field focused
    inputField.addEventListener('blur', () => {
        setTimeout(() => inputField.focus(), 0);
    });

});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chatMessage', input.value);
        console.log('Sent message:', input.value);
        input.value = '';
    }
});

function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
}
function isScrolledToBottom() {
    return messages.scrollHeight - messages.clientHeight <= messages.scrollTop + 1;
}