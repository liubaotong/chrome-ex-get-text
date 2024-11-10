document.addEventListener('DOMContentLoaded', async function() {
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
    
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout;
    let currentFilters = {
        category: '',
        tag: '',
        search: ''
    };

    // 使用 window.utils.getServerUrl() 替代直接获取
    const serverUrl = await window.utils.getServerUrl();
    loadFilters();
    loadFavorites();

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

            const data = await window.utils.fetchApi(`/api/favorites?${queryParams}`);
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
        dialog.className = 'dialog text-collector-dialog';
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

            try {
                // 禁用保存按钮并显示加载状态
                saveBtn.disabled = true;
                saveBtn.textContent = '保存中...';
                saveBtn.style.backgroundColor = '#ccc';  // 设置为禁用状态的颜色

                const data = {
                    category_id: parseInt(dialog.querySelector('#category-select').value) || null,
                    text: dialog.querySelector('#selected-text').value,
                    url: dialog.querySelector('#page-url').value,
                    tags: Array.from(dialog.querySelector('#tag-select').selectedOptions)
                        .map(option => option.textContent)
                };

                await window.utils.fetchApi(`/api/favorites/${favorite.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });

                // 显示成功消息
                showMessage('保存成功', 'success');
                
                // 恢复按钮状态
                saveBtn.textContent = '保存';
                saveBtn.style.backgroundColor = '#0078d4';
                
                // 两秒后关闭弹窗并刷新列表
                setTimeout(async () => {
                    dialog.remove();
                    await loadFavorites();
                }, 2000);

            } catch (error) {
                console.error('保存失败:', error);
                showMessage('保存失败：' + (error.message || '请稍后重试'), 'error');
                
                // 恢复保存按钮状态
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                saveBtn.style.backgroundColor = '#0078d4';
            }
        });
    }

    // 加载分类和标签数据
    async function loadCategoriesAndTags(favorite) {
        try {
            // 加载分类
            const categories = await window.utils.fetchApi('/api/categories');
            const categorySelect = document.querySelector('#category-select');
            categorySelect.innerHTML = ''; // 清空现有选项
            
            // 添加一个默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '请选择分类';
            categorySelect.appendChild(defaultOption);
            
            if (Array.isArray(categories)) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    option.selected = category.id === favorite.category_id;
                    categorySelect.appendChild(option);
                });
            } else {
                console.error('分类数据格式错误:', categories);
            }

            // 加载标签
            const tags = await window.utils.fetchApi('/api/tags');
            const tagSelect = document.querySelector('#tag-select');
            tagSelect.innerHTML = ''; // 清空现有选项
            
            // 解析已选标签
            const selectedTags = favorite.tags ? 
                (typeof favorite.tags === 'string' ? JSON.parse(favorite.tags) : favorite.tags) 
                : [];
            
            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag.id;
                    option.textContent = tag.name;
                    option.selected = selectedTags.includes(tag.name); // 检查标签是否已选中
                    tagSelect.appendChild(option);
                });
            } else {
                console.error('标签数据格式错误:', tags);
            }

            console.log('分类和标签加载完成', {
                categories,
                tags,
                selectedCategory: favorite.category_id,
                selectedTags: selectedTags
            });
        } catch (error) {
            console.error('加载分类和标签失败:', error);
            showMessage('加载分类和标签失败: ' + error.message, 'error');
        }
    }

    // 删除收藏
    async function deleteFavorite(id) {
        if (!confirm('确定要删除这条收藏吗？')) {
            return;
        }

        try {
            await window.utils.fetchApi(`/api/favorites/${id}`, {
                method: 'DELETE'
            });

            // 使用统一的消息显示方式
            showMessage('删除成功', 'success');
            await loadFavorites();
        } catch (error) {
            console.error('删除失败:', error);
            showMessage('删除失败，请稍后重试', 'error');
        }
    }

    // 加载筛选选项
    async function loadFilters() {
        try {
            // 加载分类
            const categories = await window.utils.fetchApi('/api/categories');
            categoryFilter.innerHTML = '<option value="">全部分类</option>';
            if (Array.isArray(categories)) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categoryFilter.appendChild(option);
                });
            } else {
                console.error('分类数据格式错误:', categories);
            }

            // 加载标签
            const tags = await window.utils.fetchApi('/api/tags');
            tagFilter.innerHTML = '<option value="">全部标签</option>';
            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag.id;
                    option.textContent = tag.name;
                    tagFilter.appendChild(option);
                });
            } else {
                console.error('标签数据格式错误:', tags);
            }
        } catch (error) {
            console.error('加载筛选选项失败:', error);
            showMessage('加载筛选选项失败，请刷新页面重试', 'error');
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
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = text;
        messageDiv.className = type;  // 使用 'success' 或 'error' 作为类名
        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';
        
        // 添加动画效果
        messageDiv.style.animation = 'fadeIn 0.3s ease';
        
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.style.animation = '';  // 清除动画，为下次显示做准备
            }, 300);
        }, 3000);
    }

    // 修改初始化部分
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            await loadFilters();  // 先加载筛选选项
            await loadFavorites(); // 再加载收藏列表
        } catch (error) {
            console.error('初始化失败:', error);
            showMessage('页面初始化失败，请刷新重试', 'error');
        }
    });
}); 