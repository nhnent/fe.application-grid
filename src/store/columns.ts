import { Column, ColumnInfo, Dictionary, Relations } from './types';
import { OptColumn, OptColumnOptions, OptRowHeader } from '../types';
import { reactive } from '../helper/reactive';
import { createMapFromArray } from '../helper/common';
import { DefaultRenderer } from '../renderer/default';
import { editorMap } from '../editor/manager';
import { CellEditorClass } from '../editor/types';
import { RowHeaderInputRenderer } from '../renderer/rowHeaderInput';

const defMinWidth = {
  ROW_HEADER: 40,
  COLUMN: 50
};

const DEF_ROW_HEADER_INPUT = '<input type="checkbox" name="_checked" />';

function getEditorInfo(editor?: string | CellEditorClass, editorOptions?: Dictionary<any>) {
  if (typeof editor === 'string') {
    const editInfo = editorMap[editor];
    return {
      editor: editInfo[0],
      editorOptions: { ...editInfo[1], ...editorOptions }
    };
  }
  return { editor, editorOptions };
}

function getRelationMap(relations: Relations[]) {
  const relationMap: Dictionary<Relations> = {};
  relations.forEach((relation) => {
    const { editable, disabled, listItems, targetNames = [] } = relation;
    targetNames.forEach((targetName) => {
      relationMap[targetName] = {
        editable,
        disabled,
        listItems
      };
    });
  });

  return relationMap;
}

function getRelationColumns(relations: Relations[]) {
  const relationColumns: string[] = [];
  relations.forEach((relation) => {
    const { targetNames = [] } = relation;
    targetNames.forEach((targetName) => {
      relationColumns.push(targetName);
    });
  });

  return relationColumns;
}

// eslint-disable-next-line complexity
function createColumn(
  column: OptColumn,
  columnOptions: OptColumnOptions,
  relationColumns: string[]
): ColumnInfo {
  const {
    header,
    name,
    width,
    minWidth,
    align,
    hidden,
    resizable,
    editor,
    editorOptions,
    renderer,
    rendererOptions,
    relations
  } = column;
  const fixedWidth = typeof width === 'number';
  const baseWidth = (width === 'auto' ? 0 : width) || 0;
  const relationMap = getRelationMap(relations || []);
  // @TODO apply some method in common helper
  const isRelated = relationColumns.some((relationColumnName) => relationColumnName === name);

  return reactive({
    name,
    header: header || name,
    hidden: Boolean(hidden),
    resizable: Boolean(resizable),
    align: align || 'left',
    renderer: renderer || DefaultRenderer,
    rendererOptions,
    fixedWidth,
    baseWidth,
    minWidth: minWidth || columnOptions.minWidth || defMinWidth.COLUMN, // @TODO meta tag 체크 여부
    relationMap,
    isRelated,
    ...getEditorInfo(editor, editorOptions)
  });
}

function createRowHeader(data: OptRowHeader): ColumnInfo {
  const rowHeader = typeof data === 'string' ? { name: data } : data;
  const { name, header, align, renderer, rendererOptions, width, minWidth } = rowHeader;

  const baseRendererOptions = rendererOptions || { inputType: 'checkbox' };
  const baseMinWith = typeof minWidth === 'number' ? minWidth : defMinWidth.ROW_HEADER;
  const baseWidth = (width === 'auto' ? baseMinWith : width) || baseMinWith;

  const isRowNum = name === '_number';

  let defaultHeader = '';

  if (isRowNum) {
    defaultHeader = 'No.';
  } else if (baseRendererOptions.inputType === 'checkbox') {
    defaultHeader = DEF_ROW_HEADER_INPUT;
  }

  return reactive({
    name,
    header: header || defaultHeader,
    hidden: false,
    resizable: false,
    align: align || 'center',
    renderer: renderer || (isRowNum ? DefaultRenderer : RowHeaderInputRenderer),
    rendererOptions: baseRendererOptions,
    fixedWidth: true,
    baseWidth,
    minWidth: baseMinWith
  });
}

export function create(
  columns: OptColumn[],
  columnOptions: OptColumnOptions = {},
  rowHeaders: OptRowHeader[]
): Column {
  const relationColumns = columns.reduce((relationCol: string[], { relations }) => {
    return relationCol.concat(getRelationColumns(relations || []));
  }, []);
  const rowHeaderInfos = rowHeaders.map((rowHeader) => createRowHeader(rowHeader));
  const columnInfos = columns.map((column) => createColumn(column, columnOptions, relationColumns));
  const allColumns = rowHeaderInfos.concat(columnInfos);

  return reactive({
    frozenCount: columnOptions.frozenCount || 0,
    allColumns,

    get allColumnMap() {
      return createMapFromArray(this.allColumns, 'name') as Dictionary<ColumnInfo>;
    },

    get visibleColumns() {
      return allColumns.filter(({ hidden }) => !hidden);
    },

    get visibleColumnsBySide() {
      const frozenLastIndex = this.frozenCount + this.rowHeaderCount;

      return {
        L: this.visibleColumns.slice(0, frozenLastIndex),
        R: this.visibleColumns.slice(frozenLastIndex)
      };
    },

    get visibleFrozenCount(this: Column) {
      return this.visibleColumnsBySide.L.length;
    },

    get rowHeaderCount() {
      return rowHeaderInfos.length;
    }
  });
}
