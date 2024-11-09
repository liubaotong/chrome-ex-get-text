use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Category {
    #[schema(example = "1")]
    pub id: Option<i64>,
    #[schema(example = "技术文章")]
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Tag {
    #[schema(example = "1")]
    pub id: Option<i64>,
    #[schema(example = "Rust")]
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Bookmark {
    #[schema(example = "1")]
    pub id: Option<i64>,
    #[schema(example = "Rust编程指南")]
    pub content: String,
    #[schema(example = "https://example.com/rust-guide")]
    pub url: String,
    #[schema(example = "1")]
    pub category_id: Option<i64>,
    #[schema(example = "[1, 2]")]
    pub tag_ids: Vec<i64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BookmarkQuery {
    #[schema(example = "1")]
    pub page: Option<u32>,
    #[schema(example = "10")]
    pub per_page: Option<u32>,
    #[schema(example = "Rust")]
    pub search: Option<String>,
    #[schema(example = "1")]
    pub category_id: Option<i64>,
    #[schema(example = "1")]
    pub tag_id: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PaginatedBookmarks {
    pub bookmarks: Vec<BookmarkDetail>,
    #[schema(example = "100")]
    pub total: u32,
    #[schema(example = "1")]
    pub page: u32,
    #[schema(example = "10")]
    pub per_page: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BookmarkDetail {
    #[schema(example = "1")]
    pub id: i64,
    #[schema(example = "Rust编程指南")]
    pub content: String,
    #[schema(example = "https://example.com/rust-guide")]
    pub url: String,
    #[schema(example = "1")]
    pub category_id: Option<i64>,
    #[schema(example = "技术文章")]
    pub category_name: Option<String>,
    pub tags: Vec<Tag>,
    #[schema(example = "2024-03-14T12:00:00")]
    pub created_at: String,
} 