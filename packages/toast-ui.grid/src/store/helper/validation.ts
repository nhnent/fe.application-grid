import { OptRow } from '@t/options';
import { Validation, ValidationType, Column } from '@t/store/column';
import { RowKey, CellValue, Row } from '@t/store/data';
import {
  isString,
  isBlank,
  isFunction,
  omit,
  convertToNumber,
  isNumber,
  includes,
  some
} from '../../helper/common';
import {
  isObservable,
  notify,
  unobservedInvoke,
  getOriginObject,
  Observable,
  getRunningObservers
} from '../../helper/observable';
import { getInstance } from '../../instance';

type UniqueInfoMap = Record<string, Record<string, RowKey[]>>;

interface TargetCellInfo {
  rowKey: RowKey;
  columnName: string;
  prevValue: CellValue;
  value: CellValue;
}

interface ValidationOption {
  id: number;
  value: CellValue;
  row: Row;
  columnName: string;
  validation?: Validation;
}

const instanceValidationMap: Record<number, UniqueInfoMap> = {};
const isValidatingUniquenessMap: Record<string, boolean> = {};

export function createNewValidationMap(id: number) {
  instanceValidationMap[id] = {};
}

export function invokeWithUniqueValidationColumn(column: Column, fn: (name: string) => void) {
  column.validationColumns.forEach(({ name, validation }) => {
    if (validation!.unique) {
      fn(name);
    }
  });
}

export function addUniqueInfoMap(id: number, row: OptRow, column: Column) {
  invokeWithUniqueValidationColumn(column, name =>
    addColumnUniqueInfoMap(id, row.rowKey as RowKey, name, row[name])
  );
}

export function removeUniqueInfoMap(id: number, row: OptRow, column: Column) {
  invokeWithUniqueValidationColumn(column, name =>
    removeColumnUniqueInfoMap(id, row.rowKey as RowKey, name, row[name])
  );
}

function removeColumnUniqueInfoMap(
  id: number,
  rowKey: RowKey,
  columnName: string,
  cellValue: CellValue
) {
  const value = String(cellValue);
  const uniqueInfoMap = instanceValidationMap[id];

  if (uniqueInfoMap && uniqueInfoMap[value] && uniqueInfoMap[value][columnName]) {
    uniqueInfoMap[value][columnName] = uniqueInfoMap[value][columnName].filter(
      targetRowKey => targetRowKey !== rowKey
    );
  }
}

function addColumnUniqueInfoMap(
  id: number,
  rowKey: RowKey,
  columnName: string,
  cellValue: CellValue
) {
  const value = String(cellValue);
  const uniqueInfoMap = instanceValidationMap[id];

  uniqueInfoMap[value] = uniqueInfoMap[value] || {};
  uniqueInfoMap[value][columnName] = uniqueInfoMap[value][columnName] || [];
  uniqueInfoMap[value][columnName].push(rowKey);
}

export function replaceColumnUniqueInfoMap(
  id: number,
  column: Column,
  { rowKey, columnName, prevValue, value }: TargetCellInfo
) {
  if (some(({ name }) => name === columnName, column.validationColumns)) {
    removeColumnUniqueInfoMap(id, rowKey, columnName, prevValue);
    addColumnUniqueInfoMap(id, rowKey, columnName, value);
  }
}

export function forceValidateUniquenessOfColumns(rawData: Row[], column: Column) {
  if (rawData.length) {
    // trick for forcing to validate the uniqueness
    invokeWithUniqueValidationColumn(column, name => notify(rawData[0], name));
  }
}

export function forceValidateUniquenessOfColumn(
  rawData: Row[],
  column: Column,
  columnName: string
) {
  if (some(({ name }) => name === columnName, column.validationColumns) && rawData.length) {
    // trick for forcing to validate the uniqueness
    notify(rawData[0], columnName);
  }
}

function hasDuplicateValue(id: number, columnName: string, cellValue: CellValue) {
  const value = String(cellValue);
  const uniqueInfoMap = instanceValidationMap[id];

  return !!(uniqueInfoMap && uniqueInfoMap[value] && uniqueInfoMap[value][columnName]?.length > 1);
}

function validateDataUniqueness(
  id: number,
  value: CellValue,
  columnName: string,
  invalidStates: ValidationType[]
) {
  if (hasDuplicateValue(id, columnName, value)) {
    invalidStates.push('UNIQUE');
  }

  // prevent recursive call of 'validateDataUniqueness' when scrolling or manipulating the data
  if (
    !isValidatingUniquenessMap[columnName] &&
    !includes(getRunningObservers(), 'lazyObservable')
  ) {
    let rawData: Row[] = [];
    unobservedInvoke(() => {
      // @TODO: should get the latest rawData through function(not private field of the grid instance)
      // @ts-ignore
      rawData = getInstance(id).store.data.rawData;
    });
    isValidatingUniquenessMap[columnName] = true;

    rawData.forEach(row => {
      if (isObservable(row)) {
        notify(row, columnName);
      }
    });

    setTimeout(() => {
      isValidatingUniquenessMap[columnName] = false;
    });
  }
}

export function getValidationCode({ id, value, row, columnName, validation }: ValidationOption) {
  const invalidStates: ValidationType[] = [];

  if (!validation) {
    return invalidStates;
  }

  const { required, dataType, min, max, regExp, unique, validatorFn } = validation;

  if (required && isBlank(value)) {
    invalidStates.push('REQUIRED');
  }

  if (unique) {
    validateDataUniqueness(id, value, columnName, invalidStates);
  }

  if (isFunction(validatorFn)) {
    const originRow = omit(
      getOriginObject(row as Observable<Row>),
      'sortKey',
      'uniqueKey',
      '_relationListItemMap',
      '_disabledPriority'
    ) as Row;

    unobservedInvoke(() => {
      if (!validatorFn(value, originRow, columnName)) {
        invalidStates.push('VALIDATOR_FN');
      }
    });
  }

  if (dataType === 'string' && !isString(value)) {
    invalidStates.push('TYPE_STRING');
  }

  if (regExp && isString(value) && !regExp.test(value)) {
    invalidStates.push('REGEXP');
  }

  const numberValue = convertToNumber(value);

  if (dataType === 'number' && !isNumber(numberValue)) {
    invalidStates.push('TYPE_NUMBER');
  }

  if (isNumber(min) && isNumber(numberValue) && numberValue < min) {
    invalidStates.push('MIN');
  }

  if (isNumber(max) && isNumber(numberValue) && numberValue > max) {
    invalidStates.push('MAX');
  }

  return invalidStates;
}
