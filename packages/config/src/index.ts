// The root `@hsm/config` export is the shared BASE config (the vars the shared
// packages `@hsm/database`/`@hsm/queue`/`@hsm/storage` consume). Backend apps
// import their own config instead: `@hsm/config/api` / `@hsm/config/worker`.
export { type BaseEnvs, baseEnvs as envs, getWebhookSigningKeys } from './base';
export { FIELDS, type FieldName, validateEnv } from './fields';
