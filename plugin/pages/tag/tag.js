document.addEventListener('DOMContentLoaded', function() {
    const newTagInput = document.getElementById('newTag');
    const addBtn = document.getElementById('addBtn');
    const tagTable = document.getElementById('tagTable');
    const messageDiv = document.getElementById('message');
    let serverUrl;

    // 获取服务器地址
    chrome.storage.local.get(['serverUrl'], function(result) {
        serverUrl = result.serverUrl || 'http://localhost:3000';
        loadTags();
    });

    // 加载标签列表
    async function loadTags() {
        try {
            const response = await fetch(`${serverUrl}/api/tags`);
            const tags = await response.json();
            renderTags(tags);
        } catch (error) {
            showMessage('加载标签失败: ' + error.message, 'error');
        }
    }

    // 渲染标签列表
    function renderTags(tags) {
        tagTable.innerHTML = '';
        tags.forEach(tag => {
            const tr = document.createElement('tr');
            tr.dataset.id = tag.id;
            tr.innerHTML = `
                <td class="tag-name">${tag.name}</td>
                <td>
                    <div class="button-group">
                        <button class="edit-btn">编辑</button>
                        <button class="delete-btn">删除</button>
                    </div>
                </td>
            `;
            tagTable.appendChild(tr);

            // 绑定编辑按钮事件
            tr.querySelector('.edit-btn').addEventListener('click', () => {
                startEdit(tr, tag);
            });

            // 绑定删除按钮事件
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                deleteTag(tag.id);
            });
        });
    }

    // 添加新标签
    addBtn.addEventListener('click', async function() {
        const name = newTagInput.value.trim();
        if (!name) {
            showMessage('请输入标签名称', 'error');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                showMessage('添加成功', 'success');
                newTagInput.value = '';
                loadTags();
            } else {
                throw new Error('添加失败');
            }
        } catch (error) {
            showMessage('添加失败: ' + error.message, 'error');
        }
    });

    // 开始编辑
    function startEdit(tr, tag) {
        const nameCell = tr.querySelector('.tag-name');
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
            updateTag(tag.id, input.value.trim());
        });

        cancelBtn.addEventListener('click', () => {
            nameCell.textContent = originalName;
        });
    }

    // 更新标签
    async function updateTag(id, name) {
        if (!name) {
            showMessage('标签名称不能为空', 'error');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/tags/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                showMessage('更新成功', 'success');
                loadTags();
            } else {
                throw new Error('更新失败');
            }
        } catch (error) {
            showMessage('更新失败: ' + error.message, 'error');
        }
    }

    // 删除标签
    async function deleteTag(id) {
        if (!confirm('确定要删除这个标签吗？')) {
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/api/tags/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showMessage('删除成功', 'success');
                loadTags();
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