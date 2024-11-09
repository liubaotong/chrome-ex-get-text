use axum::{
    routing::{get, post, delete, put},
    Router,
};
use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::{
    cors::{CorsLayer, Any},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
use sqlx::sqlite::SqlitePool;
use dotenv::dotenv;

mod api_doc;
mod config;
mod db;
mod error;
mod handlers {
    pub mod favorite;
    pub mod category;
    pub mod tag;
}

/// 创建应用路由
/// 设置所有 API 端点的路由规则
fn create_routes(db: SqlitePool) -> Router {
    Router::new()
        .route("/api/categories", get(handlers::category::list_categories))
        .route("/api/categories", post(handlers::category::create_category))
        .route("/api/categories/:id", get(handlers::category::get_category))
        .route("/api/categories/:id", put(handlers::category::update_category))
        .route("/api/categories/:id", delete(handlers::category::delete_category))
        .route("/api/favorites", get(handlers::favorite::list_favorites))
        .route("/api/favorites", post(handlers::favorite::create_favorite))
        .route("/api/favorites/:id", put(handlers::favorite::update_favorite))
        .route("/api/favorites/:id", delete(handlers::favorite::delete_favorite))
        .route("/api/tags", get(handlers::tag::list_tags))
        .route("/api/tags", post(handlers::tag::create_tag))
        .route("/api/tags/:id", get(handlers::tag::get_tag))
        .route("/api/tags/:id", put(handlers::tag::update_tag))
        .route("/api/tags/:id", delete(handlers::tag::delete_tag))
        .route("/api/tags/:name/favorites", get(handlers::tag::get_favorites_by_tag))
        .with_state(db)
}

#[tokio::main]
async fn main() {
    // 加载环境变量
    dotenv().ok();

    // 加载应用配置
    let config = config::Config::load().expect("Failed to load config");

    // 初始化日志系统
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 初始化数据库连接池
    let pool = db::init_db().await.expect("Failed to initialize database");

    // 创建基础 API 路由
    let api_routes = create_routes(pool);

    // 创建 Swagger UI 路由，用于API文档展示
    let swagger_ui = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api_doc::ApiDoc::openapi()));

    // 配置中间件
    let middleware = ServiceBuilder::new()
        .layer(TraceLayer::new_for_http())  // 添加请求追踪
        .layer(
            CorsLayer::new()                // 配置 CORS
                .allow_origin(Any)          // 允许任何来源
                .allow_methods(Any)         // 允许任何 HTTP 方法
                .allow_headers(Any)         // 允许任何请求头
        );

    // 创建完整的应用，合并所有路由和中间件
    let app = Router::new()
        .merge(swagger_ui)
        .merge(api_routes)
        .layer(middleware);

    // 配置并启动服务器
    let addr = SocketAddr::from(([127, 0, 0, 1], config.server.port));
    tracing::info!("Server running on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service()).await.unwrap();
}
