// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendText",
    title: "发送",
    contexts: ["selection"]
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendText") {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_DIALOG",
      text: info.selectionText,
      url: tab.url
    });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_TEXT") {
    // 从storage获取服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
      const serverUrl = result.serverUrl || 'http://localhost:3000';
      
      // 直接使用request.data中的数据，因为content.js已经正确格式化了数据
      const data = {
        category_id: parseInt(request.data.category_id) || null, // 使用category_id而不是category
        text: request.data.text,
        url: request.data.url,
        tags: request.data.tags
      };
      
      // 发送数据到服务器
      fetch(`${serverUrl}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    });
    return true; // 保持消息通道打开
  }
}); 