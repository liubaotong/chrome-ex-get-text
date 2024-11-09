document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const pageSizeSelect = document.getElementById('pageSize');
    const favoriteTable = document.getElementById('favoriteTable');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const messageDiv = document.getElementById('message');
    
    let serverUrl;
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout;

    // 获取服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
        serverUrl = result.serverUrl || 'http://localhost:3000';
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
            const searchQuery = searchInput.value.trim();
            const pageSize = pageSizeSelect.value;
            const response = await fetch(
                `${serverUrl}/api/favorites?page=${currentPage}&page_size=${pageSize}&search=${searchQuery}`
            );
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
            tr.innerHTML = `
                <td>${favorite.category_name}</td>
                <td class="content-cell">${favorite.text}</td>
                <td class="url-cell">
                    <a href="${favorite.url}" target="_blank">${favorite.url}</a>
                </td>
                <td class="tags-cell">
                    <span class="tag">${favorite.tags}</span>
                </td>
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
                startEdit(tr, favorite);
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

    // 开始编辑
    function startEdit(tr, favorite) {
        const contentCell = tr.querySelector('.content-cell');
        const originalContent = contentCell.textContent;
        
        contentCell.innerHTML = `
            <textarea>${originalContent}</textarea>
            <div class="button-group">
                <button class="save-btn">保存</button>
                <button class="cancel-btn">取消</button>
            </div>
        `;

        const textarea = contentCell.querySelector('textarea');
        const saveBtn = contentCell.querySelector('.save-btn');
        const cancelBtn = contentCell.querySelector('.cancel-btn');

        saveBtn.addEventListener('click', () => {
            updateFavorite(favorite.id, textarea.value.trim());
        });

        cancelBtn.addEventListener('click', () => {
            contentCell.textContent = originalContent;
        });
    }

    // 更新收藏
    async function updateFavorite(id, text) {
        if (!text) {
            showMessage('内容不能为空', 'error');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/favorites/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                showMessage('更新成功', 'success');
                loadFavorites();
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            showMessage('更新失败: ' + error.message, 'error');
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

    // 显示消息
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}); 