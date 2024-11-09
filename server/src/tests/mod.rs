use crate::{config::Config, db::DbPool};
use rusqlite::Connection;
use std::sync::Once;

static INIT: Once = Once::new();

// 初始化测试环境
pub fn init_test() -> DbPool {
    INIT.call_once(|| {
        let _ = tracing_subscriber::fmt().try_init();
    });

    // 使用内存数据库进行测试
    let manager = r2d2_sqlite::SqliteConnectionManager::memory();
    let pool = r2d2::Pool::new(manager).expect("Failed to create pool");
    
    // 初始化数据库表
    let conn = pool.get().unwrap();
    init_test_db(&conn);
    
    pool
}

// 初始化测试数据库
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

        CREATE TABLE bookmarks (
            id INTEGER PRIMARY KEY,
            content TEXT NOT NULL,
            url TEXT NOT NULL,
            category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES categories(id)
        );

        CREATE TABLE bookmark_tags (
            bookmark_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (bookmark_id, tag_id),
            FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id),
            FOREIGN KEY(tag_id) REFERENCES tags(id)
        );

        -- 插入测试数据
        INSERT INTO categories (id, name) VALUES (1, 'Test Category');
        INSERT INTO tags (id, name) VALUES (1, 'Test Tag');
        INSERT INTO bookmarks (id, content, url, category_id) 
        VALUES (1, 'Test Content', 'http://test.com', 1);
        INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (1, 1);
        "
    ).expect("Failed to initialize test database");
} 