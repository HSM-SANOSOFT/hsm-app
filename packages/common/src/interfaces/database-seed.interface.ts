import type { EntityTarget, ObjectLiteral } from 'typeorm';

export interface SeedDefinition<T extends ObjectLiteral> {
  entity: EntityTarget<T>;
  rows: Array<Partial<T>>;
}
