use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::env;

pub async fn init_db() -> Result<SqlitePool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:data.db".to_string());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // 创建表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // 检查favorites表是否存在
    let table_exists = sqlx::query_scalar::<_, i32>(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='favorites'"
    )
    .fetch_one(&pool)
    .await?;

    if table_exists == 0 {
        // 如果表不存在，创建新表（包含created_at字段）
        sqlx::query(
            r#"
            CREATE TABLE favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER,
                text TEXT NOT NULL,
                url TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
            "#,
        )
        .execute(&pool)
        .await?;
    } else {
        // 检查created_at列是否存在
        let column_exists = sqlx::query_scalar::<_, i32>(
            "SELECT count(*) FROM pragma_table_info('favorites') WHERE name='created_at'"
        )
        .fetch_one(&pool)
        .await?;

        if column_exists == 0 {
            // 如果列不存在，创建一个临时表
            sqlx::query(
                r#"
                BEGIN TRANSACTION;
                
                -- 创建新表
                CREATE TABLE favorites_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id INTEGER,
                    text TEXT NOT NULL,
                    url TEXT NOT NULL,
                    tags TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (category_id) REFERENCES categories (id)
                );
                
                -- 复制数据，使用当前时间作为created_at的值
                INSERT INTO favorites_new (id, category_id, text, url, tags, created_at)
                SELECT id, category_id, text, url, tags, datetime('now')
                FROM favorites;
                
                -- 删除旧表
                DROP TABLE favorites;
                
                -- 重命名新表
                ALTER TABLE favorites_new RENAME TO favorites;
                
                COMMIT;
                "#,
            )
            .execute(&pool)
            .await?;
        }
    }

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
} 