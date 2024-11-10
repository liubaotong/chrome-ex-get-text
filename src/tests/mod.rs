fn init_test_db(conn: &Connection) {
    conn.execute_batch(
        "
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE favorites (
            id INTEGER PRIMARY KEY,
            text TEXT NOT NULL,
            url TEXT NOT NULL,
            category_id INTEGER,
            tags TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        -- 插入测试数据
        INSERT INTO categories (id, name) VALUES (1, 'Test Category');
        INSERT INTO tags (id, name) VALUES (1, 'Test Tag');
        INSERT INTO favorites (id, text, url, category_id, tags, created_at) 
        VALUES (1, 'Test Content', 'http://test.com', 1, '["Test Tag"]', datetime('now'));
        "
    ).expect("Failed to initialize test database");
} 