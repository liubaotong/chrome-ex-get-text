use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, FromRow};
use utoipa::ToSchema;

/// 标签数据结构
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Tag {
    pub id: i64,      // 标签ID
    pub name: String, // 标签名称
}

/// 创建标签请求
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateTag {
    pub name: String, // 标签名称
}

/// 带标签的收藏数据结构
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct TaggedFavorite {
    pub id: i64,
    pub category_name: String,
    pub text: String,
    pub url: String,
    pub tags: String,
}

/// 获取标签列表
#[utoipa::path(
    get,
    path = "/api/tags",
    tag = "tags",
    responses(
        (status = 200, description = "成功获取标签列表", body = Vec<Tag>),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn list_tags(State(db): State<SqlitePool>) -> impl IntoResponse {
    match sqlx::query_as::<_, Tag>("SELECT DISTINCT id, name FROM tags")
        .fetch_all(&db)
        .await
    {
        Ok(tags) => Json(tags).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 创建标签
#[utoipa::path(
    post,
    path = "/api/tags",
    tag = "tags",
    request_body = CreateTag,
    responses(
        (status = 201, description = "成功创建标签"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn create_tag(
    State(db): State<SqlitePool>,
    Json(tag): Json<CreateTag>,
) -> impl IntoResponse {
    match sqlx::query("INSERT INTO tags (name) VALUES (?)")
        .bind(&tag.name)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::CREATED.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 获取单个标签
#[utoipa::path(
    get,
    path = "/api/tags/{id}",
    tag = "tags",
    params(
        ("id" = i64, Path, description = "标签ID")
    ),
    responses(
        (status = 200, description = "成功获取标签", body = Tag),
        (status = 404, description = "标签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn get_tag(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
) -> impl IntoResponse {
    match sqlx::query_as::<_, Tag>("SELECT id, name FROM tags WHERE id = ?")
        .bind(id)
        .fetch_optional(&db)
        .await
    {
        Ok(Some(tag)) => Json(tag).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 更新标签
#[utoipa::path(
    put,
    path = "/api/tags/{id}",
    tag = "tags",
    params(
        ("id" = i64, Path, description = "标签ID")
    ),
    request_body = CreateTag,
    responses(
        (status = 200, description = "成功更新标签"),
        (status = 404, description = "标签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn update_tag(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
    Json(tag): Json<CreateTag>,
) -> impl IntoResponse {
    match sqlx::query("UPDATE tags SET name = ? WHERE id = ?")
        .bind(&tag.name)
        .bind(id)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 删除标签
#[utoipa::path(
    delete,
    path = "/api/tags/{id}",
    tag = "tags",
    params(
        ("id" = i64, Path, description = "标签ID")
    ),
    responses(
        (status = 200, description = "成功删除标签"),
        (status = 404, description = "标签不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn delete_tag(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(id)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 获取标签相关的收藏
#[utoipa::path(
    get,
    path = "/api/tags/{tag_name}/favorites",
    tag = "tags",
    params(
        ("tag_name" = String, Path, description = "标签名称")
    ),
    responses(
        (status = 200, description = "成功获取标签相关的收藏", body = Vec<TaggedFavorite>),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn get_favorites_by_tag(
    Path(tag_name): Path<String>,
    State(db): State<SqlitePool>,
) -> impl IntoResponse {
    let sql = r#"
        SELECT f.id, COALESCE(c.name, '未分类') as category_name, f.text, f.url, f.tags
        FROM favorites f
        LEFT JOIN categories c ON f.category_id = c.id
        WHERE f.tags LIKE ?
        ORDER BY f.id DESC
    "#;

    let pattern = format!("%{}%", tag_name);
    match sqlx::query_as::<_, TaggedFavorite>(sql)
        .bind(pattern)
        .fetch_all(&db)
        .await
    {
        Ok(favorites) => Json(favorites).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
} 