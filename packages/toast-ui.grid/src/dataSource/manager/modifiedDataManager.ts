import {
  ModifiedDataMap,
  ModificationTypeCode,
  ModifiedRowsOptions,
  ModifiedDataManager,
  ModifiedRows,
  RequestTypeCode,
  MutationParams,
} from '@t/dataSource';
import { OptRow } from '@t/options';
import { Row, RowKey } from '@t/store/data';
import {
  someProp,
  findIndex,
  isUndefined,
  omit,
  isObject,
  forEachObject,
  isEmpty,
} from '../../helper/common';
import { getOriginObject, Observable } from '../../helper/observable';
import { getOmittedInternalProp, changeRawDataToOriginDataForTree } from '../../query/data';

type ParamNameMap = { [type in ModificationTypeCode]: string };

const paramNameMap: ParamNameMap = {
  CREATE: 'createdRows',
  UPDATE: 'updatedRows',
  DELETE: 'deletedRows',
};

// @TODO: fix 'Row' type with record(Dictionary) type to use negate type or other type utility
export function getDataWithOptions(targetRows: Row[], options: ModifiedRowsOptions = {}) {
  const {
    checkedOnly = false,
    withRawData = false,
    rowKeyOnly = false,
    ignoredColumns = [],
  } = options;
  let rows = targetRows.map((row) => getOriginObject(row as Observable<Row>));

  if (checkedOnly) {
    rows = rows.filter((row) => row._attributes.checked);
  }
  if (ignoredColumns.length) {
    // @ts-ignore
    rows = rows.map((row) => omit(row, ...ignoredColumns));
  }
  if (!withRawData) {
    rows = rows.map((row) => getOmittedInternalProp(row));
  }
  if (rowKeyOnly) {
    return rows.map((row) => row.rowKey);
  }
  return rows;
}

export function createManager(): ModifiedDataManager {
  let originData: OptRow[] = [];
  let mixedOrder = false;
  const dataMap: ModifiedDataMap = {
    CREATE: [],
    UPDATE: [],
    DELETE: [],
  };
  const splice = (type: ModificationTypeCode, rowKey: RowKey[], row?: Row[]) => {
    const startIndex = findIndex((createdRow) => createdRow.rowKey === rowKey[0], dataMap[type]);
    const lastIndex = findIndex(
      (createdRow) => createdRow.rowKey === rowKey[rowKey.length - 1],
      dataMap[type]
    );

    if (startIndex !== -1) {
      if (isUndefined(row)) {
        dataMap[type].splice(startIndex, lastIndex - startIndex + 1);
      } else {
        dataMap[type].splice(startIndex, lastIndex - startIndex + 1, ...row);
      }
    }
  };
  const spliceAll = (rowKey: RowKey, row?: Row) => {
    splice('CREATE', [rowKey], !row ? row : [row]);
    splice('UPDATE', [rowKey], !row ? row : [row]);
    splice('DELETE', [rowKey], !row ? row : [row]);
  };

  return {
    // only for restore
    setOriginData(data: OptRow[]) {
      originData = changeRawDataToOriginDataForTree(data as Row[]);
    },

    getOriginData() {
      return originData;
    },

    getModifiedData(type: ModificationTypeCode, options: ModifiedRowsOptions) {
      return { [paramNameMap[type]]: getDataWithOptions(dataMap[type], options) };
    },

    getAllModifiedData(options: ModifiedRowsOptions) {
      return Object.keys(dataMap)
        .map((key) => this.getModifiedData(key as ModificationTypeCode, options))
        .reduce((acc, data) => ({ ...acc, ...data }), {} as ModifiedRows);
    },

    isModified() {
      return !!(dataMap.CREATE.length || dataMap.UPDATE.length || dataMap.DELETE.length);
    },

    isModifiedByType(type: ModificationTypeCode) {
      return !!dataMap[type].length;
    },

    push(type: ModificationTypeCode, rows: Row[], mixed = false) {
      const rowKeys = rows.map((row) => row.rowKey);
      mixedOrder = mixedOrder || mixed;
      if (type === 'UPDATE' || type === 'DELETE') {
        splice('UPDATE', rowKeys);

        const registeredRows = rows.filter(({ rowKey }) =>
          someProp('rowKey', rowKey, dataMap.CREATE)
        );

        // if the row was already registered in createdRows,
        // would update it in createdRows and not add it to updatedRows or deletedRows
        if (!isEmpty(registeredRows)) {
          const registeredRowKeys = registeredRows.map((row) => row.rowKey);

          if (type === 'UPDATE') {
            splice('CREATE', registeredRowKeys, registeredRows);
          } else {
            splice('CREATE', registeredRowKeys);
          }
          return;
        }
      }

      const notModifiedRows = rows.filter(
        ({ rowKey }) => !someProp('rowKey', rowKey, dataMap[type])
      );

      if (!isEmpty(notModifiedRows)) {
        dataMap[type].push(...notModifiedRows);
      }
    },

    clearSpecificRows(rowsMap: MutationParams) {
      forEachObject((_, key) => {
        rowsMap[key]!.forEach((row: Row | RowKey) => {
          spliceAll(isObject(row) ? row.rowKey : row);
        });
      }, rowsMap);
    },

    clear(requestTypeCode: RequestTypeCode) {
      if (requestTypeCode === 'MODIFY') {
        this.clearAll();
        return;
      }
      dataMap[requestTypeCode] = [];
    },

    clearAll() {
      dataMap.CREATE = [];
      dataMap.UPDATE = [];
      dataMap.DELETE = [];
    },

    isMixedOrder() {
      return mixedOrder;
    },
  };
}
