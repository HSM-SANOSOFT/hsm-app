import { type BaseEnvs, baseEnvs } from './base';

/**
 * `@hsm/worker` config. The worker only reads base vars (ENVIRONMENT + SMTP,
 * plus DB/Redis/S3 via the shared packages), so its config IS the base. Add a
 * worker-only field here (and to a `WorkerEnvs extends BaseEnvs` shape) if that
 * ever changes.
 */
export type WorkerEnvs = BaseEnvs;

export const envs: Readonly<WorkerEnvs> = baseEnvs;
export type Envs = typeof envs;

export { getWebhookSigningKeys } from './base';
