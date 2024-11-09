use axum::{
    extract::{Path, Query, State},
    Json,
};
use crate::{
    db::DbPool,
    error::AppError,
    models::{Bookmark, BookmarkDetail, BookmarkQuery, PaginatedBookmarks, Tag},
};

/// 获取书签列表
#[utoipa::path(
    get,
    path = "/api/bookmarks",
    tag = "bookmarks",
    params(
        ("page" = Option<u32>, Query, description = "页码，默认为1"),
        ("per_page" = Option<u32>, Query, description = "每页数量，默认为10"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("category_id" = Option<i64>, Query, description = "分类ID"),
        ("tag_id" = Option<i64>, Query, description = "标签ID")
    ),
    responses(
        (status = 200, description = "成功获取书签列表", body = PaginatedBookmarks),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn list_bookmarks(
    State(pool): State<DbPool>,
    Query(query): Query<BookmarkQuery>,
) -> Result<Json<PaginatedBookmarks>, AppError> {
    tracing::debug!("Listing bookmarks with query: {:?}", query);
    
    let conn = pool.get()
        .map_err(|e| AppError::Internal(e.to_string()))?;
    
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(10);
    let offset = (page - 1) * per_page;

    // 构建基础查询
    let mut sql = String::from(
        "SELECT DISTINCT b.id, b.content, b.url, b.category_id, c.name as category_name, 
         b.created_at FROM bookmarks b 
         LEFT JOIN categories c ON b.category_id = c.id
         LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id"
    );
    let mut count_sql = String::from(
        "SELECT COUNT(DISTINCT b.id) FROM bookmarks b 
         LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id"
    );
    let mut params_values = Vec::new();

    // 添加搜索条件
    if let Some(search) = &query.search {
        sql.push_str(" WHERE b.content LIKE ?");
        count_sql.push_str(" WHERE b.content LIKE ?");
        params_values.push(format!("%{}%", search));
    }

    if let Some(category_id) = query.category_id {
        let condition = if params_values.is_empty() { " WHERE" } else { " AND" };
        sql.push_str(&format!("{} b.category_id = ?", condition));
        count_sql.push_str(&format!("{} b.category_id = ?", condition));
        params_values.push(category_id.to_string());
    }

    if let Some(tag_id) = query.tag_id {
        let condition = if params_values.is_empty() { " WHERE" } else { " AND" };
        sql.push_str(&format!("{} bt.tag_id = ?", condition));
        count_sql.push_str(&format!("{} bt.tag_id = ?", condition));
        params_values.push(tag_id.to_string());
    }

    // 添加分页
    sql.push_str(" ORDER BY b.created_at DESC");
    sql.push_str(&format!(" LIMIT {} OFFSET {}", per_page, offset));

    tracing::debug!("Executing SQL: {}", sql);
    tracing::debug!("With params: {:?}", params_values);

    // 获取总数
    let total: u32 = conn.query_row(
        &count_sql,
        rusqlite::params_from_iter(params_values.iter()),
        |row| row.get(0)
    )?;

    // 获取书签列表
    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(params_values.iter()))?;

    let mut bookmarks = Vec::new();
    while let Some(row) = rows.next()? {
        let bookmark_id: i64 = row.get(0)?;
        
        // 获取标签
        let mut tag_stmt = conn.prepare(
            "SELECT t.id, t.name FROM tags t 
             JOIN bookmark_tags bt ON t.id = bt.tag_id 
             WHERE bt.bookmark_id = ?"
        )?;

        let tags: Vec<Tag> = tag_stmt.query_map([bookmark_id], |row| {
            Ok(Tag {
                id: Some(row.get(0)?),
                name: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        bookmarks.push(BookmarkDetail {
            id: bookmark_id,
            content: row.get(1)?,
            url: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(4)?,
            tags,
            created_at: row.get(5)?,
        });
    }

    tracing::debug!("Found {} bookmarks", bookmarks.len());
    Ok(Json(PaginatedBookmarks {
        bookmarks,
        total,
        page,
        per_page,
    }))
}

/// 创建新书签
#[utoipa::path(
    post,
    path = "/api/bookmarks",
    tag = "bookmarks",
    request_body = Bookmark,
    responses(
        (status = 200, description = "成功创建书签", body = BookmarkDetail),
        (status = 400, description = "无效的分类或标签"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn create_bookmark(
    State(pool): State<DbPool>,
    Json(bookmark): Json<Bookmark>,
) -> Result<Json<BookmarkDetail>, AppError> {
    tracing::debug!("Creating new bookmark: {:?}", bookmark);
    
    let mut conn = pool.get()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let tx = conn.transaction()?;

    // 插入书签
    tx.execute(
        "INSERT INTO bookmarks (content, url, category_id) VALUES (?1, ?2, ?3)",
        [&bookmark.content, &bookmark.url, &bookmark.category_id.map(|id| id.to_string()).unwrap_or_default()],
    )?;

    let bookmark_id = tx.last_insert_rowid();

    // 插入标签关联
    for tag_id in bookmark.tag_ids {
        tx.execute(
            "INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?1, ?2)",
            [bookmark_id, tag_id],
        )?;
    }

    tx.commit()?;

    // 获取完整的书签信息
    get_bookmark_detail(&pool, bookmark_id)
        .map(Json)
}

/// 获取单个书签
#[utoipa::path(
    get,
    path = "/api/bookmarks/{id}",
    tag = "bookmarks",
    params(
        ("id" = i64, Path, description = "书签ID")
    ),
    responses(
        (status = 200, description = "成功获取书签", body = BookmarkDetail),
        (status = 404, description = "书签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn get_bookmark(
    State(pool): State<DbPool>,
    Path(id): Path<i64>,
) -> Result<Json<BookmarkDetail>, AppError> {
    tracing::debug!("Getting bookmark with id: {}", id);
    get_bookmark_detail(&pool, id).map(Json)
}

/// 更新书签
#[utoipa::path(
    post,
    path = "/api/bookmarks/{id}",
    tag = "bookmarks",
    params(
        ("id" = i64, Path, description = "书签ID")
    ),
    request_body = Bookmark,
    responses(
        (status = 200, description = "成功更新书签", body = BookmarkDetail),
        (status = 400, description = "无效的分类或标签"),
        (status = 404, description = "书签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn update_bookmark(
    State(pool): State<DbPool>,
    Path(id): Path<i64>,
    Json(bookmark): Json<Bookmark>,
) -> Result<Json<BookmarkDetail>, AppError> {
    tracing::debug!("Updating bookmark {}: {:?}", id, bookmark);
    
    let mut conn = pool.get()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let tx = conn.transaction()?;

    // 更新书签
    let result = tx.execute(
        "UPDATE bookmarks SET content = ?1, url = ?2, category_id = ?3 WHERE id = ?4",
        [&bookmark.content, &bookmark.url, &bookmark.category_id.map(|id| id.to_string()).unwrap_or_default(), &id.to_string()],
    )?;

    if result == 0 {
        return Err(AppError::NotFound(format!("Bookmark with id {} not found", id)));
    }

    // 更新标签关联
    tx.execute("DELETE FROM bookmark_tags WHERE bookmark_id = ?1", [id])?;

    for tag_id in bookmark.tag_ids {
        tx.execute(
            "INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?1, ?2)",
            [id, tag_id],
        )?;
    }

    tx.commit()?;

    // 获取更新后的书签信息
    get_bookmark_detail(&pool, id).map(Json)
}

/// 删除书签
#[utoipa::path(
    delete,
    path = "/api/bookmarks/{id}",
    tag = "bookmarks",
    params(
        ("id" = i64, Path, description = "书签ID")
    ),
    responses(
        (status = 200, description = "成功删除书签"),
        (status = 404, description = "书签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn delete_bookmark(
    State(pool): State<DbPool>,
    Path(id): Path<i64>,
) -> Result<(), AppError> {
    tracing::debug!("Deleting bookmark with id: {}", id);
    
    let mut conn = pool.get()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let tx = conn.transaction()?;

    // 删除标签关联
    tx.execute("DELETE FROM bookmark_tags WHERE bookmark_id = ?1", [id])?;
    
    // 删除书签
    let result = tx.execute("DELETE FROM bookmarks WHERE id = ?1", [id])?;
    
    if result == 0 {
        return Err(AppError::NotFound(format!("Bookmark with id {} not found", id)));
    }

    tx.commit()?;
    
    tracing::debug!("Successfully deleted bookmark {}", id);
    Ok(())
}

// 辅助函数：获取书签详细信息
fn get_bookmark_detail(pool: &DbPool, id: i64) -> Result<BookmarkDetail, AppError> {
    let conn = pool.get()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let mut stmt = conn.prepare(
        "SELECT b.id, b.content, b.url, b.category_id, c.name as category_name, b.created_at 
         FROM bookmarks b 
         LEFT JOIN categories c ON b.category_id = c.id 
         WHERE b.id = ?"
    )?;

    let bookmark = stmt.query_row([id], |row| {
        let bookmark_id: i64 = row.get(0)?;
        
        // 获取标签
        let mut tag_stmt = conn.prepare(
            "SELECT t.id, t.name FROM tags t 
             JOIN bookmark_tags bt ON t.id = bt.tag_id 
             WHERE bt.bookmark_id = ?"
        )?;

        let tags = tag_stmt.query_map([bookmark_id], |row| {
            Ok(Tag {
                id: Some(row.get(0)?),
                name: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(BookmarkDetail {
            id: bookmark_id,
            content: row.get(1)?,
            url: row.get(2)?,
            category_id: row.get(3)?,
            category_name: row.get(4)?,
            tags,
            created_at: row.get(5)?,
        })
    })?;

    Ok(bookmark)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::init_test;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::{get, post},
        Router,
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_list_bookmarks() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", get(list_bookmarks))
            .with_state(pool);

        let response = app
            .oneshot(Request::builder().uri("/api/bookmarks").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: PaginatedBookmarks = serde_json::from_slice(&body).unwrap();
        
        assert!(!result.bookmarks.is_empty());
        assert_eq!(result.bookmarks[0].content, "Test Content");
        assert_eq!(result.bookmarks[0].url, "http://test.com");
        assert!(!result.bookmarks[0].tags.is_empty());
        assert_eq!(result.bookmarks[0].tags[0].name, "Test Tag");
    }

    #[tokio::test]
    async fn test_create_bookmark() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", post(create_bookmark))
            .with_state(pool);

        let bookmark = Bookmark {
            id: None,
            content: "New Bookmark".to_string(),
            url: "http://example.com".to_string(),
            category_id: Some(1),
            tag_ids: vec![1],
            created_at: None,
        };

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/bookmarks")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&bookmark).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let created: BookmarkDetail = serde_json::from_slice(&body).unwrap();
        
        assert_eq!(created.content, "New Bookmark");
        assert_eq!(created.url, "http://example.com");
        assert_eq!(created.category_id, Some(1));
        assert!(!created.tags.is_empty());
    }

    #[tokio::test]
    async fn test_search_bookmarks() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", get(list_bookmarks))
            .with_state(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/bookmarks?search=Test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: PaginatedBookmarks = serde_json::from_slice(&body).unwrap();
        
        assert!(!result.bookmarks.is_empty());
        assert!(result.bookmarks[0].content.contains("Test"));
    }

    #[tokio::test]
    async fn test_filter_by_category() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", get(list_bookmarks))
            .with_state(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/bookmarks?category_id=1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: PaginatedBookmarks = serde_json::from_slice(&body).unwrap();
        
        assert!(!result.bookmarks.is_empty());
        assert_eq!(result.bookmarks[0].category_id, Some(1));
    }

    #[tokio::test]
    async fn test_filter_by_tag() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", get(list_bookmarks))
            .with_state(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/bookmarks?tag_id=1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: PaginatedBookmarks = serde_json::from_slice(&body).unwrap();
        
        assert!(!result.bookmarks.is_empty());
        assert_eq!(result.bookmarks[0].tags[0].id, Some(1));
    }

    #[tokio::test]
    async fn test_update_bookmark() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks/:id", post(update_bookmark))
            .with_state(pool);

        let bookmark = Bookmark {
            id: Some(1),
            content: "Updated Content".to_string(),
            url: "http://updated.com".to_string(),
            category_id: Some(1),
            tag_ids: vec![1],
            created_at: None,
        };

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/bookmarks/1")
                    .header("Content-Type", "application/json")
                    .body(Body::from(serde_json::to_string(&bookmark).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let updated: BookmarkDetail = serde_json::from_slice(&body).unwrap();
        
        assert_eq!(updated.content, "Updated Content");
        assert_eq!(updated.url, "http://updated.com");
    }

    #[tokio::test]
    async fn test_delete_bookmark() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks/:id", delete(delete_bookmark))
            .with_state(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method("DELETE")
                    .uri("/api/bookmarks/1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        // 验证书签已被删除
        let app = Router::new()
            .route("/api/bookmarks/:id", get(get_bookmark))
            .with_state(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/bookmarks/1")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_pagination() {
        let pool = init_test();
        let app = Router::new()
            .route("/api/bookmarks", get(list_bookmarks))
            .with_state(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/bookmarks?page=1&per_page=5")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        
        let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
        let result: PaginatedBookmarks = serde_json::from_slice(&body).unwrap();
        
        assert_eq!(result.page, 1);
        assert_eq!(result.per_page, 5);
    }
} 