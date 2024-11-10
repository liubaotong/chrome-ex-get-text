use utoipa::OpenApi;
use crate::handlers::{category, favorite, tag};

#[derive(OpenApi)]
#[openapi(
    paths(
        category::list_categories,
        category::create_category,
        category::get_category,
        category::update_category,
        category::delete_category,
        favorite::list_favorites,
        favorite::create_favorite,
        favorite::update_favorite,
        favorite::delete_favorite,
        tag::list_tags,
        tag::get_favorites_by_tag
    ),
    components(
        schemas(
            category::Category,
            favorite::Favorite,
            favorite::FavoriteResponse,
            favorite::CreateFavorite,
            favorite::UpdateFavorite,
            tag::Tag
        )
    ),
    tags(
        (name = "categories", description = "Category management endpoints"),
        (name = "favorites", description = "Favorite management endpoints"),
        (name = "tags", description = "Tag management endpoints")
    )
)]
pub struct ApiDoc; 