import { h, Component } from 'preact';
import { connect } from './hoc';
import { DispatchProps } from '../dispatch/create';
import { cls } from '../helper/dom';
import {
  ActiveColumnAddress,
  ColumnInfo,
  Filter,
  NumberFilterCode,
  TextFilterCode
} from '../store/types';
import { FILTER_DEBOUNCE_TIME, filterSelectOption } from '../helper/filter';
import { debounce } from '../helper/common';
import { keyNameMap, isNotFilterKey } from '../helper/keyboard';
import { KeyNameMap } from '../types';

type SelectOption = { [key in NumberFilterCode | TextFilterCode]: string };

interface StoreProps {
  columnInfo: ColumnInfo;
  filters: Filter[] | null;
}

interface OwnProps {
  columnAddress: ActiveColumnAddress;
  filterState: Filter;
  filterIndex: number;
}

type Props = StoreProps & OwnProps & DispatchProps;

class TextFilterComp extends Component<Props> {
  private inputEl?: HTMLInputElement;

  private selectEl?: HTMLSelectElement;

  private getPreviousValue = () => {
    const { filterIndex, filterState } = this.props;
    const { state } = filterState;

    let code = 'eq';
    let value = '';

    if (state.length > 0 && state[filterIndex]) {
      const { code: prevCode, value: prevValue } = state[filterIndex];
      code = prevCode!;
      value = String(prevValue);
    }

    return { value, code };
  };

  private handleChange = debounce((ev: KeyboardEvent) => {
    const { dispatch } = this.props;
    const { keyCode } = ev;

    if (isNotFilterKey(keyCode)) {
      return;
    }

    const keyName = (keyNameMap as KeyNameMap)[keyCode];

    if (keyName === 'enter') {
      dispatch('applyActiveFilterState');
    } else {
      const { filterIndex } = this.props;
      const value = this.inputEl!.value;
      const code = this.selectEl!.value as NumberFilterCode | TextFilterCode;

      dispatch('setActiveFilterState', { value, code }, filterIndex);
    }
  }, FILTER_DEBOUNCE_TIME);

  public render() {
    const { columnInfo } = this.props;
    const { code, value } = this.getPreviousValue();
    const selectOption = filterSelectOption[
      columnInfo.filter!.type as 'number' | 'text'
    ] as SelectOption;

    return (
      <div>
        <div className={cls('filter-dropdown')}>
          <select
            ref={ref => {
              this.selectEl = ref;
            }}
            onChange={this.handleChange}
          >
            {Object.keys(selectOption).map(key => {
              return (
                <option value={key} key={key} selected={code === key}>
                  {selectOption[key as NumberFilterCode | TextFilterCode]}
                </option>
              );
            })}
          </select>
        </div>
        <input
          ref={ref => {
            this.inputEl = ref;
          }}
          type="text"
          className={cls('filter-input')}
          onKeyUp={this.handleChange}
          value={value}
        />
      </div>
    );
  }
}

export const TextFilter = connect<StoreProps, OwnProps>(
  (store, { filterIndex, columnAddress, filterState }) => {
    const { column, data } = store;
    const { allColumnMap } = column;
    const { filters } = data;

    return {
      columnInfo: allColumnMap[columnAddress.name],
      columnAddress,
      filterIndex,
      filters,
      filterState
    };
  }
)(TextFilterComp);
