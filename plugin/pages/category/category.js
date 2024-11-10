class CategoryManager {
    constructor() {
        this.newCategoryInput = document.getElementById('newCategory');
        this.addBtn = document.getElementById('addBtn');
        this.categoryTable = document.getElementById('categoryTable');
        this.messageDiv = document.getElementById('message');
        
        this.init();
    }
    
    init() {
        this.loadCategories();
        this.bindEvents();
    }
    
    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addCategory());
    }
    
    async loadCategories() {
        try {
            console.log('开始加载分类...');
            const categories = await window.utils.fetchApi('/api/categories');
            console.log('获取到的分类数据:', categories);
            this.renderCategories(categories);
        } catch (error) {
            console.error('加载分类失败:', error);
            // 直接使用 showMessage 显示错误
            window.utils.showMessage(this.messageDiv, '加载分类失败，请稍后重试', 'error');
        }
    }

    renderCategories(categories) {
        console.log('开始渲染分类...');
        if (!Array.isArray(categories)) {
            console.error('分类数据不是数组格式:', categories);
            return;
        }
        
        this.categoryTable.innerHTML = '';
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
            this.categoryTable.appendChild(tr);

            tr.querySelector('.edit-btn').addEventListener('click', () => {
                this.startEdit(tr, category);
            });

            tr.querySelector('.delete-btn').addEventListener('click', () => {
                this.deleteCategory(category.id);
            });
        });
        console.log('分类渲染完成');
    }

    async addCategory() {
        const name = this.newCategoryInput.value.trim();
        if (!name) {
            this.showErrorMessage('请输入分类名称');
            return;
        }

        try {
            await window.utils.fetchApi('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            this.showSuccessMessage('添加成功');
            this.newCategoryInput.value = '';
            await this.loadCategories();
        } catch (error) {
            console.error('添加分类失败:', error);
            this.showErrorMessage('添加失败，请稍后重试');
        }
    }

    startEdit(tr, category) {
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
            this.updateCategory(category.id, input.value.trim());
        });

        cancelBtn.addEventListener('click', () => {
            nameCell.textContent = originalName;
        });

        input.focus();
        input.select();

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.updateCategory(category.id, input.value.trim());
            }
        });
    }

    async updateCategory(id, name) {
        if (!name) {
            this.showErrorMessage('分类名称不能为空');
            return;
        }

        try {
            await window.utils.fetchApi(`/api/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    id: parseInt(id),  // 确保 id 是数字类型
                    name: name 
                })
            });

            this.showSuccessMessage('更新成功');
            await this.loadCategories();
        } catch (error) {
            console.error('更新分类失败:', error);
            this.showErrorMessage(error.message || '服务器响应错误，请稍后重试');
        }
    }

    async deleteCategory(id) {
        if (!confirm('确定要删除这个分类吗？')) {
            return;
        }

        try {
            await window.utils.fetchApi(`/api/categories/${id}`, {
                method: 'DELETE'
            });

            this.showSuccessMessage('删除成功');
            await this.loadCategories();
        } catch (error) {
            console.error('删除分类失败:', error);
            this.showErrorMessage('删除失败，请稍后重试');
        }
    }

    showErrorMessage(message) {
        this.messageDiv.textContent = message;
        this.messageDiv.className = 'error';
        this.messageDiv.style.display = 'block';
        this.messageDiv.style.opacity = '1';
        
        setTimeout(() => {
            this.messageDiv.style.opacity = '0';
            setTimeout(() => {
                this.messageDiv.style.display = 'none';
            }, 300);
        }, 3000);
    }

    showSuccessMessage(message) {
        this.messageDiv.textContent = message;
        this.messageDiv.className = 'success';
        this.messageDiv.style.display = 'block';
        this.messageDiv.style.opacity = '1';
        
        setTimeout(() => {
            this.messageDiv.style.opacity = '0';
            setTimeout(() => {
                this.messageDiv.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new CategoryManager();
}); 