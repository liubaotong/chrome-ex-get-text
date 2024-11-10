use crate::{config::Config, db::DbPool};
use rusqlite::Connection;
use std::sync::Once;
use axum::{
    body::Body,
    http::{Request, StatusCode},
    routing::{get, post, put, delete},
    Router,
};
use tower::ServiceExt;
use serde_json::json;
use crate::handlers::{category, favorite, tag};

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
        -- 删除旧表(如果存在)
        DROP TABLE IF EXISTS bookmark_tags;
        DROP TABLE IF EXISTS bookmarks;

        -- 创建必要的表
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
        VALUES (1, 'Test Content', 'http://test.com', 1, '[\"Test Tag\"]', datetime('now'));
        "
    ).expect("Failed to initialize test database");
}

#[cfg(test)]
mod tests {
    use super::*;

    // 分类相关测试
    #[tokio::test]
    async fn test_category_crud() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/categories", get(category::list_categories))
            .route("/api/categories", post(category::create_category))
            .route("/api/categories/:id", get(category::get_category))
            .route("/api/categories/:id", put(category::update_category))
            .route("/api/categories/:id", delete(category::delete_category))
            .with_state(pool);

        // 测试获取分类列表
        let response = app
            .clone()
            .oneshot(Request::builder().uri("/api/categories").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let categories: Vec<category::Category> = serde_json::from_slice(&body).unwrap();
        assert!(!categories.is_empty());

        // 测试创建分类
        let new_category = json!({
            "name": "New Category"
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/categories")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&new_category).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        // 测试更新分类
        let update_category = json!({
            "id": 1,
            "name": "Updated Category"
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri("/api/categories/1")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&update_category).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试删除分类
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri("/api/categories/1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // 标签相关测试
    #[tokio::test]
    async fn test_tag_crud() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/tags", get(tag::list_tags))
            .route("/api/tags", post(tag::create_tag))
            .route("/api/tags/:id", get(tag::get_tag))
            .route("/api/tags/:id", put(tag::update_tag))
            .route("/api/tags/:id", delete(tag::delete_tag))
            .with_state(pool);

        // 测试获取标签列表
        let response = app
            .clone()
            .oneshot(Request::builder().uri("/api/tags").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let tags: Vec<tag::Tag> = serde_json::from_slice(&body).unwrap();
        assert!(!tags.is_empty());

        // 测试创建标签
        let new_tag = json!({
            "name": "New Tag"
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/tags")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&new_tag).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);

        // 测试更新标签
        let update_tag = json!({
            "name": "Updated Tag"
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri("/api/tags/1")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&update_tag).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试删除标签
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri("/api/tags/1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // 收藏相关测试
    #[tokio::test]
    async fn test_favorite_crud() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/favorites", get(favorite::list_favorites))
            .route("/api/favorites", post(favorite::create_favorite))
            .route("/api/favorites/:id", put(favorite::update_favorite))
            .route("/api/favorites/:id", delete(favorite::delete_favorite))
            .with_state(pool);

        // 测试获取收藏列表
        let response = app
            .clone()
            .oneshot(Request::builder().uri("/api/favorites").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let favorites: favorite::FavoriteResponse = serde_json::from_slice(&body).unwrap();
        assert!(!favorites.items.is_empty());

        // 测试创建收藏
        let new_favorite = json!({
            "category_id": 1,
            "text": "New Favorite",
            "url": "http://example.com",
            "tags": ["Test Tag"]
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/favorites")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&new_favorite).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试更新收藏
        let update_favorite = json!({
            "category_id": 1,
            "text": "Updated Favorite",
            "url": "http://example.com",
            "tags": ["Test Tag"]
        });
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri("/api/favorites/1")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&update_favorite).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试删除收藏
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri("/api/favorites/1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // 测试搜索和过滤功能
    #[tokio::test]
    async fn test_search_and_filter() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/favorites", get(favorite::list_favorites))
            .with_state(pool);

        // 测试搜索
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/favorites?search=Test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: favorite::FavoriteResponse = serde_json::from_slice(&body).unwrap();
        assert!(!result.items.is_empty());

        // 测试分类过滤
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/favorites?category_id=1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试标签过滤
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/favorites?tag_id=1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // 测试分页
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/favorites?page=1&per_page=5")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: favorite::FavoriteResponse = serde_json::from_slice(&body).unwrap();
        assert!(result.items.len() <= 5);
    }
} 