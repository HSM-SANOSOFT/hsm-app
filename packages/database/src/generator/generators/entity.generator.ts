import { DriversEnum } from '@hsm/database/generator/definitions';
import { getArgs } from '@hsm/database/generator/utils';
import { oracleEntityGenerator } from './oracle';

async function entityGenerator() {
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
      await oracleEntityGenerator(args);
    }
  }
}

entityGenerator().then();
