// 移除 import，直接使用 window.utils

class PopupManager {
    constructor() {
        this.categoryManageBtn = document.getElementById('categoryManage');
        this.tagManageBtn = document.getElementById('tagManage');
        this.favoriteManageBtn = document.getElementById('favoriteManage');
        this.settingsBtn = document.getElementById('settings');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // 打开分类管理页面
        this.categoryManageBtn.addEventListener('click', () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/category/index.html')
            });
        });

        // 打开标签管理页面
        this.tagManageBtn.addEventListener('click', () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/tag/index.html')
            });
        });

        // 打开收藏管理页面
        this.favoriteManageBtn.addEventListener('click', () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/favorite/index.html')
            });
        });

        // 打开设置页面
        this.settingsBtn.addEventListener('click', () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL('pages/settings/index.html')
            });
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
}); 