import {
  ParseArgsConfig,
  ParseArgsOptionDescriptor,
  parseArgs,
} from 'node:util';
import { Logger } from '@nestjs/common';

type RequiredOptionDescriptor = ParseArgsOptionDescriptor & {
  optional?: boolean;
};

export type ArgOptionsMap = Record<string, RequiredOptionDescriptor>;

type InferArgs<T extends ArgOptionsMap> = {
  [K in keyof T]: T[K]['multiple'] extends true
    ? T[K]['type'] extends 'string'
      ? string[]
      : T[K]['type'] extends 'boolean'
        ? boolean[]
        : never
    : T[K]['type'] extends 'string'
      ? string
      : T[K]['type'] extends 'boolean'
        ? boolean
        : never;
};

export function getArgs<T extends ArgOptionsMap>(options: T): InferArgs<T> {
  const logger = new Logger('Arg Parser');

  const { values } = parseArgs({
    options: options as ParseArgsConfig['options'],
  });

  const missing: string[] = [];

  for (const key of Object.keys(options) as (keyof T)[]) {
    const def = options[key];
    const isOptional = def.optional === true;

    if (!isOptional && values[key as string] === undefined) {
      missing.push(String(key));
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing arguments: ${missing.join(', ')}.`);
    process.exit(1);
  }

  return values as InferArgs<T>;
}
