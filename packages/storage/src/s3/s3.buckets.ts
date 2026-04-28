export const APP_S3_BUCKETS = ['hsm-docs'] as const;

export type AppS3Bucket = (typeof APP_S3_BUCKETS)[number];
