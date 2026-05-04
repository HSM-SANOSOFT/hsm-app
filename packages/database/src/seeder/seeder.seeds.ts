import type { SeedDefinition } from '@hsm/common/interfaces';
import { templateComEmailSeed, templatesSeed } from './modules/core/template';

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous array of seeds
export const ALL_SEEDS: SeedDefinition<any>[] = [
  templatesSeed,
  templateComEmailSeed,
];
