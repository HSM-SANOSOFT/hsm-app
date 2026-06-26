// Sets dummy env vars before @hsm/config Joi validation runs.
// All external services are mocked in unit tests — no real credentials needed.
process.env.ENVIRONMENT = 'test';
process.env.SWAGGER_FAVICON = 'http://localhost/favicon.ico';
process.env.SWAGGER_SITE_TITLE = 'Test';
process.env.SMTP_ADDRESS = 'smtp.test.local';
process.env.SMTP_USERNAME = 'test@test.local';
process.env.SMTP_PASSWORD = 'test-smtp-pass';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.JWT_AT_SECRET = 'test-at-secret-32-chars-padding!!';
process.env.JWT_RT_SECRET = 'test-rt-secret-32-chars-padding!!';
process.env.DB_POSTGRES_HOST = 'localhost';
process.env.DB_POSTGRES_PORT = '5432';
process.env.DB_POSTGRES_USER = 'test';
process.env.DB_POSTGRES_PASSWORD = 'test';
process.env.DB_POSTGRES_DB = 'test';
process.env.DB_POSTGRES_RUN_MIGRATIONS = 'false';
process.env.DB_ORACLE_HOST = 'localhost';
process.env.DB_ORACLE_PORT = '1521';
process.env.DB_ORACLE_USER = 'test';
process.env.DB_ORACLE_PASSWORD = 'test';
process.env.DB_ORACLE_DB = 'test';
process.env.DB_REDIS_HOST = 'localhost';
process.env.DB_REDIS_PORT = '6379';
process.env.DB_REDIS_USER = 'test';
process.env.DB_REDIS_PASSWORD = 'test';
process.env.STRG_S3_ACCESS_KEY = 'test-s3-key';
// Keep force_path_style true so STRG_S3_HOST is required (not forbidden).
// dotenv does not override existing vars, but will add STRG_S3_HOST from .env
// if it is not pre-set here — causing a Joi conflict when FORCE_PATH_STYLE=false.
process.env.STRG_S3_FORCE_PATH_STYLE = 'true';
process.env.STRG_S3_HOST = 'http://localhost:9000';
process.env.STRG_S3_HOST_EXTERNAL = 'http://localhost:9000';
process.env.STRG_S3_REGION = 'us-east-1';
process.env.STRG_S3_SECRET_KEY = 'test-s3-secret';
process.env.COMS_WEBHOOK_SIGNING_KEYS = '{"mandrill":"test-key"}';
