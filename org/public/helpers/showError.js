function showError(message, type = 'fail') { // Default parameter for common use case
    const container = document.getElementById('error-container');
    container.innerHTML = '';
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
    errorMessage.style.display = 'block';
    if (type === 'neutral') { // Apply different styles based on type
        errorMessage.style.color = 'white';
        errorMessage.style.border = 'white';
    }
}

module.exports = showError;