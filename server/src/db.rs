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

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            text TEXT NOT NULL,
            url TEXT NOT NULL,
            tags TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

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