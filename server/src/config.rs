use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
}

impl Config {
    pub fn load() -> Result<Self, config::ConfigError> {
        let config_path = env::var("CONFIG_PATH").unwrap_or_else(|_| "config".to_string());
        
        let builder = config::Config::builder()
            .add_source(config::File::with_name(&config_path).required(false))
            .add_source(config::Environment::with_prefix("APP"))
            .build()?;

        builder.try_deserialize()
    }
} 