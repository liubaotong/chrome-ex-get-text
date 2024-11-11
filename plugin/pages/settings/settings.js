document.addEventListener('DOMContentLoaded', function() {
    const serverUrlInput = document.getElementById('serverUrl');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const messageDiv = document.getElementById('message');

    // 加载已保存的服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
        if (result.serverUrl) {
            serverUrlInput.value = result.serverUrl;
        }
    });

    // 保存设置
    saveBtn.addEventListener('click', function() {
        const serverUrl = serverUrlInput.value.trim();
        
        if (!serverUrl) {
            window.utils.showMessage(messageDiv, '请输入服务器地址', 'error');
            return;
        }

        chrome.storage.local.set({
            serverUrl: serverUrl
        }, function() {
            window.utils.showMessage(messageDiv, '设置已保存', 'success');
        });
    });

    // 测试连接
    testBtn.addEventListener('click', async function() {
        const serverUrl = serverUrlInput.value.trim();
        
        if (!serverUrl) {
            window.utils.showMessage(messageDiv, '请输入服务器地址', 'error');
            return;
        }

        testBtn.disabled = true;
        testBtn.textContent = '测试中...';

        try {
            const response = await fetch(`${serverUrl}/api/health`);
            const data = await response.json();
            
            if (response.ok && data.status === 'ok') {
                window.utils.showMessage(messageDiv, '连接成功: ' + data.message, 'success');
            } else {
                window.utils.showMessage(messageDiv, '连接失败: ' + (data.message || response.statusText), 'error');
            }
        } catch (error) {
            window.utils.showMessage(messageDiv, '连接失败: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
        }
    });
}); 
