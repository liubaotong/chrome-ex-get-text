document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const pageSizeSelect = document.getElementById('pageSize');
    const favoriteTable = document.getElementById('favoriteTable');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const messageDiv = document.getElementById('message');
    const categoryFilter = document.getElementById('categoryFilter');
    const tagFilter = document.getElementById('tagFilter');
    const searchBtn = document.getElementById('searchBtn');
    
    let serverUrl;
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout;
    let currentFilters = {
        category: '',
        tag: '',
        search: ''
    };

    // 获取服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
        serverUrl = result.serverUrl || 'http://localhost:3000';
        loadFilters();  // 加载筛选选项
        loadFavorites();
    });

    // 搜索输入防抖
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadFavorites();
        }, 500);
    });

    // 切换每页显示数量
    pageSizeSelect.addEventListener('change', function() {
        currentPage = 1;
        loadFavorites();
    });

    // 上一页
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadFavorites();
        }
    });

    // 下一页
    nextPageBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            loadFavorites();
        }
    });

    // 加载收藏列表
    async function loadFavorites() {
        try {
            const pageSize = pageSizeSelect.value;
            const queryParams = new URLSearchParams({
                page: currentPage,
                per_page: pageSize,
                search: currentFilters.search,
                category_id: currentFilters.category,
                tag_id: currentFilters.tag
            });

            const response = await fetch(`${serverUrl}/api/favorites?${queryParams}`);
            const data = await response.json();
            
            totalPages = Math.ceil(data.total / pageSize);
            renderFavorites(data.items);
            updatePagination();
        } catch (error) {
            showMessage('加载收藏失败: ' + error.message, 'error');
        }
    }

    // 渲染收藏列表
    function renderFavorites(favorites) {
        favoriteTable.innerHTML = '';
        favorites.forEach(favorite => {
            const tr = document.createElement('tr');
            tr.dataset.id = favorite.id;
            
            // 格式化时间
            const createdAt = new Date(favorite.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            tr.innerHTML = `
                <td class="content-cell">${favorite.text}</td>
                <td class="url-cell">
                    <a href="${favorite.url}" target="_blank">${favorite.url}</a>
                </td>
                <td class="time-cell">${createdAt}</td>
                <td>
                    <div class="button-group">
                        <button class="edit-btn">编辑</button>
                        <button class="delete-btn">删除</button>
                    </div>
                </td>
            `;
            favoriteTable.appendChild(tr);

            // 绑定编辑按钮事件
            tr.querySelector('.edit-btn').addEventListener('click', () => {
                showEditDialog(favorite);
            });

            // 绑定删除按钮事件
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                deleteFavorite(favorite.id);
            });
        });
    }

    // 更新分页信息
    function updatePagination() {
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    // 显示编辑弹窗
    async function showEditDialog(favorite) {
        const dialog = document.createElement('div');
        dialog.className = 'text-collector-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3 class="dialog-title">编辑收藏</h3>
                    <button class="close-btn" title="关闭">&times;</button>
                </div>
                <div class="dialog-body">
                    <div class="form-group">
                        <label>分类:</label>
                        <select id="category-select" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label>文本内容:</label>
                        <textarea id="selected-text" class="form-control">${favorite.text}</textarea>
                    </div>
                    <div class="form-group">
                        <label>网页地址:</label>
                        <input type="text" id="page-url" class="form-control" value="${favorite.url}" readonly>
                    </div>
                    <div class="form-group">
                        <label>标签:</label>
                        <select id="tag-select" class="form-control" multiple></select>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button id="save-btn" class="primary-btn">保存</button>
                </div>
                <div id="save-message" class="save-message"></div>
            </div>
        `;
        document.body.appendChild(dialog);

        // 加载分类和标签数据
        await loadCategoriesAndTags(favorite);

        // 绑定关闭按钮事件
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            dialog.remove();
        });

        // 修改保存按钮事件处理部分
        dialog.querySelector('#save-btn').addEventListener('click', async () => {
            const saveBtn = dialog.querySelector('#save-btn');
            const messageDiv = dialog.querySelector('#save-message');

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
                const response = await fetch(`${serverUrl}/api/favorites/${favorite.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    messageDiv.textContent = '保存成功！';
                    messageDiv.className = 'save-message success';
                    
                    setTimeout(() => {
                        dialog.remove();
                        loadFavorites(); // 重新加载列表
                    }, 1000);
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '保存失败');
                }
            } catch (error) {
                messageDiv.textContent = '保存失败：' + error.message;
                messageDiv.className = 'save-message error';
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
            }
        });
    }

    // 加载分类和标签数据
    async function loadCategoriesAndTags(favorite) {
        try {
            // 加载分类
            const categoriesResponse = await fetch(`${serverUrl}/api/categories`);
            const categories = await categoriesResponse.json();
            const categorySelect = document.querySelector('#category-select');
            categorySelect.innerHTML = ''; // 清空现有选项
            
            // 添加一个默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '请选择分类';
            categorySelect.appendChild(defaultOption);
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                option.selected = category.id === favorite.category_id;
                categorySelect.appendChild(option);
            });

            // 加载标签
            const tagsResponse = await fetch(`${serverUrl}/api/tags`);
            const tags = await tagsResponse.json();
            const tagSelect = document.querySelector('#tag-select');
            tagSelect.innerHTML = ''; // 清空现有选项
            
            // 解析已选标签
            const selectedTags = favorite.tags ? JSON.parse(favorite.tags) : [];
            
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.id;
                option.textContent = tag.name;
                option.selected = selectedTags.includes(tag.name); // 检查标签是否已选中
                tagSelect.appendChild(option);
            });
        } catch (error) {
            console.error('加载分类和标签失败:', error);
        }
    }

    // 删除收藏
    async function deleteFavorite(id) {
        if (!confirm('确定要删除这条收藏吗？')) {
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/favorites/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showMessage('删除成功', 'success');
                loadFavorites();
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            showMessage('删除失败: ' + error.message, 'error');
        }
    }

    // 加载筛选选项
    async function loadFilters() {
        try {
            // 加载分类
            const categoriesResponse = await fetch(`${serverUrl}/api/categories`);
            const categories = await categoriesResponse.json();
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categoryFilter.appendChild(option);
            });

            // 加载标签
            const tagsResponse = await fetch(`${serverUrl}/api/tags`);
            const tags = await tagsResponse.json();
            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.id;
                option.textContent = tag.name;
                tagFilter.appendChild(option);
            });
        } catch (error) {
            showMessage('加载筛选选项失败: ' + error.message, 'error');
        }
    }

    // 搜索按钮点击事件
    searchBtn.addEventListener('click', () => {
        currentPage = 1;
        currentFilters.search = searchInput.value.trim();
        loadFavorites();
    });

    // 回车键触发搜索
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // 分类筛选变化
    categoryFilter.addEventListener('change', () => {
        currentPage = 1;
        currentFilters.category = categoryFilter.value;
        loadFavorites();
    });

    // 标签筛选变化
    tagFilter.addEventListener('change', () => {
        currentPage = 1;
        currentFilters.tag = tagFilter.value;
        loadFavorites();
    });

    // 优化消息显示
    function showMessage(text, type) {
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
    }
}); 