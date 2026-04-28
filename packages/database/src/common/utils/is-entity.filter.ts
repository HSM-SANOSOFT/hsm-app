import { getMetadataArgsStorage } from 'typeorm';

export const isEntity = (v: unknown) =>
  getMetadataArgsStorage().tables.some(t => t.target === v);
