import {
  Data,
  Row,
  Dictionary,
  CellValue,
  Column,
  ColumnInfo,
  Formatter,
  CellRenderData
} from './types';
import { reactive, watch, Reactive } from '../helper/reactive';
import { OptRow } from '../types';

function getFormattedValue(value: CellValue, fn?: Formatter, defValue?: string) {
  if (typeof fn === 'function') {
    return fn(value);
  }
  if (typeof fn === 'string') {
    return fn;
  }
  return defValue || '';
}

function createViewCell(value: CellValue, column: ColumnInfo): CellRenderData {
  const { formatter, prefix, postfix, editor } = column;

  return {
    // @TODO: change editable/disabled using relations
    editable: !!editor,
    disabled: false,
    formattedValue: getFormattedValue(value, formatter, String(value)),
    prefix: getFormattedValue(value, prefix),
    postfix: getFormattedValue(value, postfix),
    value
  };
}

function createViewRow(row: Row, columnMap: Dictionary<ColumnInfo>) {
  const { rowKey } = row;
  const initValueMap: Dictionary<CellRenderData | null> = {};

  Object.keys(columnMap).forEach((name) => {
    initValueMap[name] = null;
  });

  const valueMap = reactive(initValueMap) as Dictionary<CellRenderData>;

  Object.keys(columnMap).forEach((name) => {
    watch(() => {
      valueMap[name] = createViewCell(row[name], columnMap[name]);
    });
  });

  return { rowKey, valueMap };
}

export function create(data: OptRow[], column: Column): Reactive<Data> {
  const rawData = data.map((row, index) => {
    const rowKeyAdded = { rowKey: index, _number: index + 1, _checked: false, ...row };

    return reactive(rowKeyAdded as Row);
  });

  const viewData = rawData.map((row: Row) => createViewRow(row, column.allColumnMap));

  return reactive({
    rawData,
    viewData,

    // @TODO meta 프로퍼티 값으로 변경
    get checkedAllRows() {
      const checkedRows = rawData.filter(({ _checked }) => _checked);

      return checkedRows.length === rawData.length;
    }
  });
}
