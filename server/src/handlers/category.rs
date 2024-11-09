use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, FromRow};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Category {
    pub id: i64,
    pub name: String,
}

// 添加新的结构体用于创建分类
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCategory {
    pub name: String,
}

/// 获取分类列表
#[utoipa::path(
    get,
    path = "/api/categories",
    tag = "categories",
    responses(
        (status = 200, description = "成功获取分类列表", body = Vec<Category>),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn list_categories(State(db): State<SqlitePool>) -> impl IntoResponse {
    match sqlx::query_as::<_, Category>("SELECT id, name FROM categories")
        .fetch_all(&db)
        .await
    {
        Ok(categories) => Json(categories).into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 创建分类
#[utoipa::path(
    post,
    path = "/api/categories",
    tag = "categories",
    request_body = CreateCategory,
    responses(
        (status = 201, description = "成功创建分类"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn create_category(
    State(db): State<SqlitePool>,
    Json(category): Json<CreateCategory>,
) -> impl IntoResponse {
    match sqlx::query("INSERT INTO categories (name) VALUES (?)")
        .bind(&category.name)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::CREATED.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 获取单个分类
#[utoipa::path(
    get,
    path = "/api/categories/{id}",
    tag = "categories",
    params(
        ("id" = i64, Path, description = "分类ID")
    ),
    responses(
        (status = 200, description = "成功获取分类", body = Category),
        (status = 404, description = "分类不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn get_category(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
) -> impl IntoResponse {
    match sqlx::query_as::<_, Category>("SELECT id, name FROM categories WHERE id = ?")
        .bind(id)
        .fetch_optional(&db)
        .await
    {
        Ok(Some(category)) => Json(category).into_response(),
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 更新分类
#[utoipa::path(
    put,
    path = "/api/categories/{id}",
    tag = "categories",
    params(
        ("id" = i64, Path, description = "分类ID")
    ),
    request_body = Category,
    responses(
        (status = 200, description = "成功更新分类"),
        (status = 404, description = "分类不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn update_category(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
    Json(category): Json<Category>,
) -> impl IntoResponse {
    match sqlx::query("UPDATE categories SET name = ? WHERE id = ?")
        .bind(&category.name)
        .bind(id)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
}

/// 删除分类
#[utoipa::path(
    delete,
    path = "/api/categories/{id}",
    tag = "categories",
    params(
        ("id" = i64, Path, description = "分类ID")
    ),
    responses(
        (status = 200, description = "成功删除分类"),
        (status = 404, description = "分类不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn delete_category(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM categories WHERE id = ?")
        .bind(id)
        .execute(&db)
        .await
    {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    }
} 