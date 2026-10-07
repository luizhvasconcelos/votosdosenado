from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./votosdosenado.db"
    cors_origins: str = "http://localhost:3000"
    senado_senators_url: str = "https://legis.senado.leg.br/dadosabertos/senador/lista/atual"
    senado_votes_url: str = "https://legis.senado.leg.br/dadosabertos/votacao"
    votes_start_year: int = 2019

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
