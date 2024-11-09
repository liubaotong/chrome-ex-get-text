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
            showMessage('请输入服务器地址', 'error');
            return;
        }

        chrome.storage.local.set({
            serverUrl: serverUrl
        }, function() {
            showMessage('设置已保存', 'success');
        });
    });

    // 测试连接
    testBtn.addEventListener('click', async function() {
        const serverUrl = serverUrlInput.value.trim();
        
        if (!serverUrl) {
            showMessage('请输入服务器地址', 'error');
            return;
        }

        testBtn.disabled = true;
        testBtn.textContent = '测试中...';

        try {
            const response = await fetch(`${serverUrl}/api/health`);
            const data = await response.json();
            
            if (response.ok && data.status === 'ok') {
                showMessage('连接成功: ' + data.message, 'success');
            } else {
                showMessage('连接失败: ' + (data.message || response.statusText), 'error');
            }
        } catch (error) {
            showMessage('连接失败: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
        }
    });

    // 显示消息
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.style.opacity = '1';
            }, 300);
        }, 3000);
    }
}); 