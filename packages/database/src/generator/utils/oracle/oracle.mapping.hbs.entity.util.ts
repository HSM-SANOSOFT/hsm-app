import {
  OracleColumns,
  OracleConstrains,
  OracleEntityHbsData,
  OracleIndex,
} from '@hsm/database/generator/definitions';
import {
  normalize,
  toCamelCase,
  toPascalCase,
} from '@hsm/database/generator/utils';
import { Logger } from '@nestjs/common';

const logger = new Logger('oracleEntityMapping');

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const x of b) {
    if (!sa.has(x)) return false;
  }
  return true;
}

function oracleDataTypeMapping(column: OracleColumns): string | undefined {
  const dataType = normalize(column.DATA_TYPE)?.toUpperCase();
  if (!dataType) return undefined;

  switch (dataType) {
    case 'NUMBER':
      return 'number';

    case 'VARCHAR2':
    case 'VARCHAR':
      return 'varchar';

    case 'NVARCHAR2':
      return 'nvarchar';

    case 'CHAR':
      return 'char';

    case 'NCHAR':
      return 'nchar';

    case 'DATE':
      return 'date';

    case 'TIMESTAMP':
    case 'TIMESTAMP(6)':
    case 'TIMESTAMP WITH TIME ZONE':
    case 'TIMESTAMP WITH LOCAL TIME ZONE':
      return 'timestamp';

    case 'CLOB':
    case 'NCLOB':
      return 'clob';

    case 'BLOB':
    case 'RAW':
    case 'LONG RAW':
      return 'blob';

    case 'LONG':
      return 'long';

    default:
      return undefined;
  }
}

function oracleDataTypeTsMapping(column: OracleColumns): string | undefined {
  const dataType = normalize(column.DATA_TYPE)?.toUpperCase();
  if (!dataType) return undefined;

  switch (dataType) {
    case 'NUMBER':
      return 'number';

    case 'VARCHAR2':
    case 'VARCHAR':
    case 'NVARCHAR2':
    case 'CHAR':
    case 'NCHAR':
      return 'string';

    case 'DATE':
      return 'Date';

    case 'TIMESTAMP':
    case 'TIMESTAMP(6)':
    case 'TIMESTAMP WITH TIME ZONE':
    case 'TIMESTAMP WITH LOCAL TIME ZONE':
      return 'Date';

    case 'CLOB':
    case 'NCLOB':
      return 'string';

    case 'BLOB':
    case 'RAW':
    case 'LONG RAW':
      return 'Buffer';

    case 'LONG':
      return 'string';

    default:
      return undefined;
  }
}

function getTypeCapabilities(type: string | undefined) {
  switch (type) {
    case 'varchar':
    case 'nvarchar':
    case 'char':
    case 'nchar':
      return {
        supportsLength: true,
        supportsPrecision: false,
        supportsScale: false,
      };

    case 'number':
      return {
        supportsLength: false,
        supportsPrecision: true,
        supportsScale: true,
      };

    case 'timestamp':
    case 'date':
      return {
        supportsLength: false,
        supportsPrecision: false,
        supportsScale: false,
      };

    case 'clob':
    case 'blob':
    case 'long':
    case 'long raw':
      return {
        supportsLength: false,
        supportsPrecision: false,
        supportsScale: false,
      };

    default:
      return {
        supportsLength: false,
        supportsPrecision: false,
        supportsScale: false,
      };
  }
}

export function oracleEntityHbsMapping(
  columns: OracleColumns[],
  constrains: OracleConstrains[],
  indexes: OracleIndex[],
): OracleEntityHbsData {
  if (!columns.length) {
    throw new Error('oracleEntityHbsMapping: columns array is empty');
  }

  const owner = normalize(columns[0].OWNER);
  const tableName = normalize(columns[0].TABLE_NAME);

  const response: OracleEntityHbsData = {
    owner,
    tableName,
    tableNameTS: toPascalCase(tableName),
    columns: [],
  };

  for (const column of columns) {
    const dataType = oracleDataTypeMapping(column);
    const typeCapabilities = getTypeCapabilities(dataType);
    const current: OracleEntityHbsData['columns'][number] = {
      columnName: normalize(column.COLUMN_NAME),
      columnNameTS: toCamelCase(column.COLUMN_NAME),
      columnId: normalize(column.COLUMN_ID),
      dataType,
      dataLength: normalize(column.DATA_LENGTH),
      dataPrecision: normalize(column.DATA_PRECISION),
      dataScale: normalize(column.DATA_SCALE),
      dataDefault: normalize(column.DATA_DEFAULT),
      comment: normalize(column.COMMENTS),
      dataTypeTS: oracleDataTypeTsMapping(column),
      nullable: normalize(column.NULLABLE) === 'Y',
      supportsLength: typeCapabilities.supportsLength,
      supportsPrecision: typeCapabilities.supportsPrecision,
      supportsScale: typeCapabilities.supportsScale,
    };

    response.columns.push(current);
  }

  const tableConstraints = constrains.filter(
    c => normalize(c.TABLE_NAME) === tableName,
  );

  if (tableConstraints.length) {
    response.constraints = {};
    const pkRows = tableConstraints.filter(
      c => normalize(c.CONSTRAINT_TYPE) === 'P',
    );
    if (pkRows.length) {
      const pkName = normalize(pkRows[0].CONSTRAINT_NAME);
      const pkColumns = pkRows.map(pk => {
        const colName = normalize(pk.COLUMN_NAME);
        const colTSName = toCamelCase(pk.COLUMN_NAME);

        return {
          columnName: colName,
          columnNameTS: colTSName,
          isAutoGenerated: false,
        };
      });

      response.constraints.primary = {
        constraintName: pkName,
        columns: pkColumns,
      };
      const pkSet = new Set(pkColumns.map(c => c.columnName));
      for (const col of response.columns) {
        if (pkSet.has(col.columnName)) {
          col.isPrimary = true;
        }
      }
    }

    const uniqueRows = tableConstraints.filter(
      c => normalize(c.CONSTRAINT_TYPE) === 'U',
    );
    if (uniqueRows.length) {
      const uniqueMap = new Map<string, { db: string[]; ts: string[] }>();

      for (const row of uniqueRows) {
        const name = normalize(row.CONSTRAINT_NAME);
        const colName = normalize(row.COLUMN_NAME);
        const colNameTs = toCamelCase(row.COLUMN_NAME);

        if (!uniqueMap.has(name)) {
          uniqueMap.set(name, { db: [], ts: [] });
        }

        const entry = uniqueMap.get(name)!;
        entry.db.push(colName);
        entry.ts.push(colNameTs);
      }

      response.constraints.unique = Array.from(uniqueMap.entries()).map(
        ([constraintName, { db, ts }]) => ({
          constraintName,
          columnNames: db,
          columnNamesTS: ts,
        }),
      );
    }
    const fkRows = tableConstraints.filter(
      c => normalize(c.CONSTRAINT_TYPE) === 'R',
    );

    if (fkRows.length) {
      const fkMap = new Map<string, OracleConstrains[]>();

      for (const row of fkRows) {
        const name = normalize(row.CONSTRAINT_NAME);
        if (!fkMap.has(name)) fkMap.set(name, []);
        fkMap.get(name)!.push(row);
      }

      const usedRelationNames = new Set<string>();

      response.constraints.foreign = Array.from(fkMap.entries()).map(
        ([constraintName, rows]) => {
          const refTableName = normalize(rows[0].TABLE_NAME_2);
          const refTableNameTS = toPascalCase(refTableName);
          const fkColumnNames = rows.map(r => normalize(r.COLUMN_NAME));
          const pkColumns =
            response.constraints?.primary?.columns.map(c => c.columnName) ?? [];

          const isPkBased = pkColumns.length
            ? sameSet(fkColumnNames, pkColumns)
            : false;

          const uniqueConstraints = response.constraints?.unique ?? [];
          const isUniquelyConstrained = uniqueConstraints.some(u =>
            sameSet(fkColumnNames, u.columnNames),
          );

          const relationTypeTS: 'many-to-one' | 'one-to-many' | 'one-to-one' =
            isPkBased || isUniquelyConstrained ? 'one-to-one' : 'many-to-one';

          const columnsFk = rows.map(row => {
            const localColName = normalize(row.COLUMN_NAME);
            const refColName = normalize(row.COLUMN_NAME_1);

            const localCol = response.columns.find(
              c => c.columnName === localColName,
            );

            const referencedColumnName = refColName;
            const referencedColumnNameTS = toCamelCase(refColName);

            return {
              columnName: localColName,
              columnNameTS: localCol?.columnNameTS ?? toCamelCase(localColName),
              referencedTableName: refTableName,
              referencedTableNameTS: refTableNameTS,
              referencedColumnName,
              referencedColumnNameTS,
            };
          });

          const baseName = toCamelCase(refTableName);
          const firstLocal = columnsFk[0].columnNameTS;
          const suffix =
            firstLocal.charAt(0).toUpperCase() + firstLocal.slice(1);

          let relationNameTS = baseName;
          if (usedRelationNames.has(relationNameTS)) {
            relationNameTS = baseName + suffix;
          }
          usedRelationNames.add(relationNameTS);

          return {
            constraintName,
            relationNameTS,
            relationTypeTS,
            columns: columnsFk,
          };
        },
      );
    }
  }

  if (!response.constraints?.primary) {
    if (!response.constraints) {
      response.constraints = {};
    }

    const firstCol = response.columns[0];

    response.constraints.primary = {
      constraintName: `PK_${response.tableName}`,
      columns: [
        {
          columnName: firstCol.columnName,
          columnNameTS: firstCol.columnNameTS,
          isAutoGenerated: false,
        },
      ],
    };

    firstCol.isPrimary = true;
    firstCol.nullable = undefined;
    logger.warn(
      `Table ${response.tableName} has no primary key defined. Using first column ${firstCol.columnName} as primary key.`,
    );
  }

  if (indexes.length) {
    const tableIndexes = indexes.filter(
      idx => normalize(idx.TABLE_NAME) === tableName,
    );

    if (tableIndexes.length) {
      const indexMap = new Map<
        string,
        {
          indexName: string;
          columnNames: string[];
          columnNamesTS: string[];
          isUnique: boolean;
        }
      >();
      tableIndexes.sort(
        (a, b) =>
          (normalize(a.COLUMN_POSITION) ?? 0) -
          (normalize(b.COLUMN_POSITION) ?? 0),
      );

      for (const idx of tableIndexes) {
        const indexName = normalize(idx.INDEX_NAME);
        const colName = normalize(idx.COLUMN_NAME);
        const colNameTS = toCamelCase(idx.COLUMN_NAME);

        let entry = indexMap.get(indexName);
        if (!entry) {
          entry = {
            indexName,
            columnNames: [],
            columnNamesTS: [],
            isUnique: normalize(idx.UNIQUENESS) === 'UNIQUE',
          };
          indexMap.set(indexName, entry);
        }

        entry.columnNames.push(colName);
        entry.columnNamesTS.push(colNameTS);
      }

      response.indexes = Array.from(indexMap.values());
    }
  }
  const imports = new Set<string>();
  if (response.constraints?.foreign) {
    for (const fk of response.constraints.foreign) {
      for (const col of fk.columns) {
        if (col.referencedTableNameTS) {
          imports.add(`${col.referencedTableNameTS}Entity`);
        }
      }
    }
  }
  if (imports.size) {
    response.importsTS = Array.from(imports);
  }

  return response;
}
