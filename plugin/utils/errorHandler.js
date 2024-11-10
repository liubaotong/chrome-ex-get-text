window.errorHandler = {
    handleApiError(error, messageElement) {
        console.error('API Error:', error);
        let errorMessage = '操作失败，请稍后重试';
        
        if (error.response) {
            errorMessage = error.response.message || errorMessage;
        }
        
        if (window.utils && window.utils.showMessage) {
            window.utils.showMessage(messageElement, errorMessage, 'error');
        } else {
            messageElement.textContent = errorMessage;
            messageElement.className = 'message error';
        }
    }
}; 