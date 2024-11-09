use axum::{
    extract::{Path, Query, State},
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use sqlx::FromRow;
use utoipa::ToSchema;
use crate::error::AppError;

/// 收藏列表查询参数
#[derive(Debug, Serialize, Deserialize)]
pub struct ListFavoriteQuery {
    pub page: Option<i64>,      // 页码
    pub per_page: Option<i64>,  // 每页数量
    pub search: Option<String>, // 搜索关键词
    pub category_id: Option<i64>, // 分类ID
}

/// 收藏数据结构
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Favorite {
    pub id: i64,
    pub category_name: String, // 分类名称
    pub text: String,         // 收藏描述
    pub url: String,          // 收藏URL
    pub tags: String,         // 标签（JSON字符串）
}

/// 收藏列表响应
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FavoriteResponse {
    pub total: i64,           // 总记录数
    pub items: Vec<Favorite>, // 收藏列表
}

/// 创建收藏请求
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateFavorite {
    pub category_id: Option<i64>, // 分类ID（可选）
    pub text: String,            // 收藏描述
    pub url: String,             // 收藏URL
    pub tags: Vec<String>,       // 标签列表
}

/// 更新收藏请求
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateFavorite {
    pub category_id: Option<i64>, // 分类ID（可选）
    pub text: String,            // 收藏描述
    pub url: String,             // 收藏URL
    pub tags: Vec<String>,       // 标签列表
}

/// 获取收藏列表
#[utoipa::path(
    get,
    path = "/api/favorites",
    tag = "favorites",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认为1"),
        ("per_page" = Option<i64>, Query, description = "每页数量，默认为10"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("category_id" = Option<i64>, Query, description = "分类ID")
    ),
    responses(
        (status = 200, description = "成功获取收藏列表", body = FavoriteResponse),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn list_favorites(
    Query(params): Query<ListFavoriteQuery>,
    State(db): State<SqlitePool>,
) -> Result<Json<FavoriteResponse>, AppError> {
    // 处理分页参数
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);
    let offset = (page - 1) * per_page;

    // 构建基础SQL查询
    let mut sql = String::from(
        "SELECT f.id, COALESCE(c.name, '未分类') as category_name, f.text, f.url, f.tags 
         FROM favorites f 
         LEFT JOIN categories c ON f.category_id = c.id"
    );
    let mut count_sql = String::from("SELECT COUNT(*) FROM favorites f");
    let mut conditions = Vec::new();
    let mut params_values = Vec::new();

    // 处理搜索条件
    if let Some(search) = params.search {
        conditions.push("f.text LIKE ?");
        params_values.push(format!("%{}%", search));
    }

    // 处理分类筛选
    if let Some(category_id) = params.category_id {
        conditions.push("f.category_id = ?");
        params_values.push(category_id.to_string());
    }

    // 添加WHERE子句
    if !conditions.is_empty() {
        let where_clause = format!(" WHERE {}", conditions.join(" AND "));
        sql.push_str(&where_clause);
        count_sql.push_str(&where_clause);
    }

    // 添加排序和分页
    sql.push_str(" ORDER BY f.id DESC LIMIT ? OFFSET ?");

    // 执行总数查询
    let mut query = sqlx::query_scalar(&count_sql);
    for param in &params_values {
        query = query.bind(param);
    }
    let total = query.fetch_one(&db)
        .await
        .map_err(AppError::Database)?;

    // 执行列表查询
    let mut query = sqlx::query_as::<_, Favorite>(&sql);
    for param in &params_values {
        query = query.bind(param);
    }
    query = query.bind(per_page).bind(offset);

    let items = query.fetch_all(&db)
        .await
        .map_err(AppError::Database)?;

    Ok(Json(FavoriteResponse {
        total,
        items,
    }))
}

/// 创建收藏
#[utoipa::path(
    post,
    path = "/api/favorites",
    tag = "favorites",
    request_body = CreateFavorite,
    responses(
        (status = 201, description = "成功创建收藏", body = Favorite),
        (status = 400, description = "无效的请求"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn create_favorite(
    State(db): State<SqlitePool>,
    Json(payload): Json<CreateFavorite>,
) -> Result<Json<Favorite>, AppError> {
    let tags_json = serde_json::to_string(&payload.tags)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    // 插入数据并返回新创建的记录
    let favorite = sqlx::query_as::<_, Favorite>(
        "INSERT INTO favorites (category_id, text, url, tags) 
         VALUES (?, ?, ?, ?) 
         RETURNING id, 
                  COALESCE((SELECT name FROM categories WHERE id = ?), '未分类') as category_name, 
                  text, 
                  url, 
                  tags"
    )
    .bind(payload.category_id)
    .bind(&payload.text)
    .bind(&payload.url)
    .bind(&tags_json)
    .bind(payload.category_id)  // 用于 COALESCE 查询
    .fetch_one(&db)
    .await
    .map_err(AppError::Database)?;

    Ok(Json(favorite))
}

/// 更新收藏
#[utoipa::path(
    put,
    path = "/api/favorites/{id}",
    tag = "favorites",
    params(
        ("id" = i64, Path, description = "收藏ID")
    ),
    request_body = UpdateFavorite,
    responses(
        (status = 200, description = "成功更新收藏"),
        (status = 400, description = "无效的请求"),
        (status = 404, description = "收藏不存在"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn update_favorite(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
    Json(payload): Json<UpdateFavorite>,
) -> Result<StatusCode, AppError> {
    let tags_json = serde_json::to_string(&payload.tags)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let result = sqlx::query(
        "UPDATE favorites SET category_id = ?, text = ?, url = ?, tags = ? WHERE id = ?"
    )
    .bind(payload.category_id)
    .bind(payload.text)
    .bind(payload.url)
    .bind(tags_json)
    .bind(id)
    .execute(&db)
    .await
    .map_err(AppError::Database)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::OK)
}

/// 删除收藏
#[utoipa::path(
    delete,
    path = "/api/favorites/{id}",
    tag = "favorites",
    params(
        ("id" = i64, Path, description = "收藏ID")
    ),
    responses(
        (status = 200, description = "成功删除收藏"),
        (status = 500, description = "服务器内部错误")
    )
)]
pub async fn delete_favorite(
    Path(id): Path<i64>,
    State(db): State<SqlitePool>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM favorites WHERE id = ?")
        .bind(id)
        .execute(&db)
        .await
        .map_err(AppError::Database)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::OK)
} 