import { Logger } from '@nestjs/common';
import oracledb from 'oracledb';

async function getOraclePool(
  user: string,
  pass: string,
  host: string,
  port: string,
  db: string,
): Promise<oracledb.Pool> {
  const logger = new Logger('OracleDatasource');
  try {
    oracledb.initOracleClient({
      libDir: process.env.ORACLE_HOME,
    });

    oracledb.fetchAsString = [oracledb.CLOB];
    oracledb.fetchAsBuffer = [oracledb.BLOB];
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

    const pool: oracledb.Pool = await oracledb.createPool({
      user: user,
      password: pass,
      connectString: `${host}:${port}/${db}`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60,
    });

    logger.log('Oracle pool created');
    return pool;
  } catch (err) {
    logger.error('Error creating Oracle pool', err);
    process.exit(1);
  }
}

export async function getOracleConnection(
  user: string,
  pass: string,
  host: string,
  port: string,
  db: string,
): Promise<oracledb.Connection> {
  const pool: oracledb.Pool = await getOraclePool(user, pass, host, port, db);
  return pool.getConnection();
}
