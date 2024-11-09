document.addEventListener('DOMContentLoaded', function() {
    const newCategoryInput = document.getElementById('newCategory');
    const addBtn = document.getElementById('addBtn');
    const categoryTable = document.getElementById('categoryTable');
    const messageDiv = document.getElementById('message');
    let serverUrl;

    // 获取服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
        serverUrl = result.serverUrl || 'http://localhost:3000';
        loadCategories();
    });

    // 加载分类列表
    async function loadCategories() {
        try {
            const response = await fetch(`${serverUrl}/api/categories`);
            const categories = await response.json();
            renderCategories(categories);
        } catch (error) {
            showMessage('加载分类失败: ' + error.message, 'error');
        }
    }

    // 渲染分类列表
    function renderCategories(categories) {
        categoryTable.innerHTML = '';
        categories.forEach(category => {
            const tr = document.createElement('tr');
            tr.dataset.id = category.id;
            tr.innerHTML = `
                <td class="category-name">${category.name}</td>
                <td>
                    <div class="button-group">
                        <button class="edit-btn">编辑</button>
                        <button class="delete-btn">删除</button>
                    </div>
                </td>
            `;
            categoryTable.appendChild(tr);

            // 绑定编辑按钮事件
            tr.querySelector('.edit-btn').addEventListener('click', () => {
                startEdit(tr, category);
            });

            // 绑定删除按钮事件
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                deleteCategory(category.id);
            });
        });
    }

    // 添加新分类
    addBtn.addEventListener('click', async function() {
        const name = newCategoryInput.value.trim();
        if (!name) {
            showMessage('请输入分类名称', 'error');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                showMessage('添加成功', 'success');
                newCategoryInput.value = '';
                loadCategories();
            } else {
                throw new Error('添加失败');
            }
        } catch (error) {
            showMessage('添加失败: ' + error.message, 'error');
        }
    });

    // 开始编辑
    function startEdit(tr, category) {
        const nameCell = tr.querySelector('.category-name');
        const originalName = nameCell.textContent;
        
        nameCell.innerHTML = `
            <input type="text" value="${originalName}">
            <button class="save-btn">保存</button>
            <button class="cancel-btn">取消</button>
        `;

        const input = nameCell.querySelector('input');
        const saveBtn = nameCell.querySelector('.save-btn');
        const cancelBtn = nameCell.querySelector('.cancel-btn');

        saveBtn.addEventListener('click', () => {
            updateCategory(category.id, input.value.trim());
        });

        cancelBtn.addEventListener('click', () => {
            nameCell.textContent = originalName;
        });
    }

    // 更新分类
    async function updateCategory(id, name) {
        if (!name) {
            showMessage('分类名称不能为空', 'error');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                showMessage('更新成功', 'success');
                loadCategories();
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            showMessage('更新失败: ' + error.message, 'error');
        }
    }

    // 删除分类
    async function deleteCategory(id) {
        if (!confirm('确定要删除这个分类吗？')) {
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/categories/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showMessage('删除成功', 'success');
                loadCategories();
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