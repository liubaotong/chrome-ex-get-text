// 移除所有 export，只使用 window 对象
window.utils = {
    // 服务器地址获取
    async getServerUrl() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['serverUrl'], function(result) {
                resolve(result.serverUrl || 'http://localhost:3000');
            });
        });
    },

    // 统一的消息显示
    showMessage(messageDiv, text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 300);
        }, 3000);
    },

    // API 请求封装
    async fetchApi(url, options = {}) {
        try {
            const serverUrl = await this.getServerUrl();
            console.log('请求URL:', `${serverUrl}${url}`);
            console.log('请求选项:', options);

            const defaultOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const finalOptions = { ...defaultOptions, ...options };
            
            // 确保 body 是正确的 JSON 字符串
            if (finalOptions.body && typeof finalOptions.body === 'string') {
                try {
                    JSON.parse(finalOptions.body); // 验证 JSON 格式
                } catch (e) {
                    console.error('请求体 JSON 格式错误:', e);
                    throw new Error('请求数据格式错误');
                }
            }

            const response = await fetch(`${serverUrl}${url}`, finalOptions);
            
            console.log('服务器响应状态:', response.status);
            
            // 尝试获取响应文本
            const responseText = await response.text();
            console.log('原始响应数据:', responseText);

            // 如果响应是空的，直接返回 null
            if (!responseText) {
                return null;
            }

            try {
                // 尝试解析 JSON
                const data = JSON.parse(responseText);
                return data;
            } catch (e) {
                console.error('解析响应 JSON 失败:', e);
                // 如果不是 JSON 格式，返回原始文本
                return responseText;
            }

        } catch (error) {
            console.error('请求失败:', error);
            throw error;
        }
    }
}; 