class TagManager {
    constructor() {
        this.newTagInput = document.getElementById('newTag');
        this.addBtn = document.getElementById('addBtn');
        this.tagTable = document.getElementById('tagTable');
        this.messageDiv = document.getElementById('message');
        
        this.init();
    }
    
    init() {
        this.loadTags();
        this.bindEvents();
    }
    
    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addTag());
    }
    
    async loadTags() {
        try {
            console.log('开始加载标签...');
            const tags = await window.utils.fetchApi('/api/tags');
            console.log('获取到的标签数据:', tags);
            this.renderTags(tags);
        } catch (error) {
            console.error('加载标签失败:', error);
            window.utils.showMessage(this.messageDiv, '加载标签失败', 'error');
        }
    }

    renderTags(tags) {
        console.log('开始渲染标签...');
        if (!Array.isArray(tags)) {
            console.error('标签数据不是数组格式:', tags);
            return;
        }
        
        this.tagTable.innerHTML = '';
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
            this.tagTable.appendChild(tr);

            tr.querySelector('.edit-btn').addEventListener('click', () => {
                this.startEdit(tr, tag);
            });

            tr.querySelector('.delete-btn').addEventListener('click', () => {
                this.deleteTag(tag.id);
            });
        });
        console.log('标签渲染完成');
    }

    async addTag() {
        const name = this.newTagInput.value.trim();
        if (!name) {
            window.utils.showMessage(this.messageDiv, '请输入标签名称', 'error');
            return;
        }

        try {
            await window.utils.fetchApi('/api/tags', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            window.utils.showMessage(this.messageDiv, '添加成功', 'success');
            this.newTagInput.value = '';
            await this.loadTags();
        } catch (error) {
            window.utils.showMessage(this.messageDiv, '添加标签失败', 'error');
        }
    }

    startEdit(tr, tag) {
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
            this.updateTag(tag.id, input.value.trim());
        });

        cancelBtn.addEventListener('click', () => {
            nameCell.textContent = originalName;
        });

        input.focus();
        input.select();

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.updateTag(tag.id, input.value.trim());
            }
        });
    }

    async updateTag(id, name) {
        if (!name) {
            window.utils.showMessage(this.messageDiv, '标签名称不能为空', 'error');
            return;
        }

        try {
            await window.utils.fetchApi(`/api/tags/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name })
            });

            window.utils.showMessage(this.messageDiv, '更新成功', 'success');
            await this.loadTags();
        } catch (error) {
            window.utils.showMessage(this.messageDiv, '更新标签失败', 'error');
        }
    }

    async deleteTag(id) {
        if (!confirm('确定要删除这个标签吗？')) {
            return;
        }

        try {
            await window.utils.fetchApi(`/api/tags/${id}`, {
                method: 'DELETE'
            });

            window.utils.showMessage(this.messageDiv, '删除成功', 'success');
            await this.loadTags();
        } catch (error) {
            window.utils.showMessage(this.messageDiv, '删除标签失败', 'error');
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new TagManager();
});