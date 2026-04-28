import { DriversEnum } from '@hsm/database/generator/definitions';
import { getArgs } from '@hsm/database/generator/utils';
import { oracleSchemaGenerator } from './oracle';

async function schemaGenerator() {
  const args = getArgs({
    driver: { type: 'string' },
    user: { type: 'string' },
    pass: { type: 'string' },
    host: { type: 'string' },
    port: { type: 'string' },
    db: { type: 'string' },
    table: { type: 'string' },
    schema: { type: 'string' },
    log: { type: 'boolean', optional: true },
    save: { type: 'boolean', optional: true },
  });

  switch (args.driver) {
    case DriversEnum.ORACLE: {
      await oracleSchemaGenerator(args);
    }
  }
}

schemaGenerator().then();
