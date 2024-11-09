document.addEventListener('DOMContentLoaded', function() {
    // 获取所有按钮元素
    const categoryManageBtn = document.getElementById('categoryManage');
    const tagManageBtn = document.getElementById('tagManage');
    const favoriteManageBtn = document.getElementById('favoriteManage');
    const settingsBtn = document.getElementById('settings');

    // 打开分类管理页面
    categoryManageBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/category/index.html')
        });
    });

    // 打开标签管理页面
    tagManageBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/tag/index.html')
        });
    });

    // 打开收藏管理页面
    favoriteManageBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/favorite/index.html')
        });
    });

    // 打开设置页面
    settingsBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/settings/index.html')
        });
    });
}); 