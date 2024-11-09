// 创建对话框HTML
function createDialog(text, url) {
  const dialog = document.createElement('div');
  dialog.className = 'text-collector-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <button class="close-btn">&times;</button>
      <h3 class="dialog-title">保存文本</h3>
      <div class="form-group">
        <label>分类:</label>
        <select id="category-select"></select>
      </div>
      <div class="form-group">
        <label>文本内容:</label>
        <textarea id="selected-text">${text}</textarea>
      </div>
      <div class="form-group">
        <label>网页地址:</label>
        <input type="text" id="page-url" value="${url}" readonly>
      </div>
      <div class="form-group">
        <label>标签:</label>
        <select id="tag-select" multiple></select>
      </div>
      <div class="btn-container">
        <button id="save-btn">保存</button>
      </div>
      <div id="save-message" class="save-message"></div>
    </div>
  `;
  return dialog;
}

// 注入样式
const style = document.createElement('style');
style.textContent = `
  .text-collector-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }
  
  .dialog-content {
    background: white;
    padding: 25px 25px 10px;
    border-radius: 8px;
    width: 360px;
    max-height: 90vh;
    position: relative;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  
  .close-btn {
    position: absolute;
    right: 10px;
    top: 10px;
    border: none;
    background: none;
    font-size: 20px;
    cursor: pointer;
  }
  
  .form-group {
    margin-bottom: 15px;
    flex-shrink: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #2c3e50;
    font-size: 14px;
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background-color: #fff;
    transition: all 0.3s ease;
  }
  
  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    border-color: #0078d4;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0,120,212,0.2);
  }
  
  .form-group textarea {
    min-height: 100px;
    max-height: 200px;
    line-height: 1.6;
    resize: vertical;
    overflow-y: auto;
  }
  
  .form-group input[readonly] {
    background-color: #f8f9fa;
    cursor: default;
  }
  
  .form-group select[multiple] {
    height: 78px;
  }
  
  .dialog-title {
    text-align: center;
    color: #2c3e50;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 15px;
    margin-top: 10px;
  }
  
  .btn-container {
    text-align: center;
    margin-top: 5px;
  }
  
  #save-btn {
    background: #0078d4;
    color: white;
    border: none;
    padding: 10px 30px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  
  #save-btn:hover {
    background: #106ebe;
  }
  
  .save-message {
    text-align: center;
    margin-top: 15px;
    padding: 8px;
    border-radius: 4px;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .save-message.success {
    background-color: #e6f4ea;
    color: #1e7e34;
    opacity: 1;
  }
  
  .save-message.error {
    background-color: #fde7e9;
    color: #dc3545;
    opacity: 1;
  }
  
  .dialog-content::-webkit-scrollbar,
  .form-group textarea::-webkit-scrollbar {
    width: 8px;
  }
  
  .dialog-content::-webkit-scrollbar-track,
  .form-group textarea::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .dialog-content::-webkit-scrollbar-thumb,
  .form-group textarea::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .dialog-content::-webkit-scrollbar-thumb:hover,
  .form-group textarea::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
`;
document.head.appendChild(style);

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SHOW_DIALOG") {
    const dialog = createDialog(request.text, request.url);
    document.body.appendChild(dialog);
    
    // 加载分类和标签数据
    loadCategoriesAndTags();
    
    // 绑定关闭按钮事件
    dialog.querySelector('.close-btn').addEventListener('click', () => {
      dialog.remove();
    });
    
    // 绑定保存按钮事件
    dialog.querySelector('#save-btn').addEventListener('click', async () => {
      const saveBtn = dialog.querySelector('#save-btn');
      const messageDiv = dialog.querySelector('#save-message');
      
      // 禁用保存按钮
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中...';
      
      const data = {
        category_id: parseInt(dialog.querySelector('#category-select').value) || null,
        text: dialog.querySelector('#selected-text').value,
        url: dialog.querySelector('#page-url').value,
        tags: Array.from(dialog.querySelector('#tag-select').selectedOptions)
          .map(option => option.textContent) // 使用标签名称而不是ID
      };
      
      try {
        // 发送数据到background script
        const response = await chrome.runtime.sendMessage({
          type: "SAVE_TEXT",
          data: data
        });
        
        if (response.success) {
          messageDiv.textContent = '保存成功！';
          messageDiv.className = 'save-message success';
          
          // 1秒后关闭对话框
          setTimeout(() => {
            dialog.remove();
          }, 1000);
        } else {
          messageDiv.textContent = '保存失败：' + response.error;
          messageDiv.className = 'save-message error';
          
          // 恢复保存按钮
          saveBtn.disabled = false;
          saveBtn.textContent = '保存';
          
          // 1秒后隐藏错误消息
          setTimeout(() => {
            messageDiv.style.opacity = '0';
          }, 1000);
        }
      } catch (error) {
        messageDiv.textContent = '保存失败：' + error.message;
        messageDiv.className = 'save-message error';
        saveBtn.disabled = false;
        saveBtn.textContent = '保存';
        
        setTimeout(() => {
          messageDiv.style.opacity = '0';
        }, 1000);
      }
    });
  }
});

// 加载分类和标签数据
async function loadCategoriesAndTags() {
  try {
    const storage = await chrome.storage.local.get(['serverUrl']);
    const serverUrl = storage.serverUrl || 'http://localhost:3000';
    
    // 加载分类
    const categoriesResponse = await fetch(`${serverUrl}/api/categories`);
    const categories = await categoriesResponse.json();
    const categorySelect = document.querySelector('#category-select');
    categorySelect.innerHTML = ''; // 清空现有选项
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择分类';
    categorySelect.appendChild(defaultOption);
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
    
    // 加载标签
    const tagsResponse = await fetch(`${serverUrl}/api/tags`);
    const tags = await tagsResponse.json();
    const tagSelect = document.querySelector('#tag-select');
    tagSelect.innerHTML = ''; // 清空现有选项
    
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag.id;
      option.textContent = tag.name;
      tagSelect.appendChild(option);
    });
  } catch (error) {
    console.error('加载分类和标签失败:', error);
  }
} 