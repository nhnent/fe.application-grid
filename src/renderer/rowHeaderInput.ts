import { CellRenderer, CellRendererProps } from './types';

export class RowHeaderInputRenderer implements CellRenderer {
  private el: HTMLInputElement;

  public constructor(props: CellRendererProps) {
    const el = document.createElement('input');

    const {
      grid,
      rowKey,
      gridDisabled,
      checkDisabled,
      columnInfo: { rendererOptions }
    } = props;

    el.type = rendererOptions ? rendererOptions.inputType : 'checkbox';
    el.name = '_checked';
    el.disabled = gridDisabled || checkDisabled;

    el.addEventListener('change', () => {
      if (el.checked) {
        grid.check(rowKey);
      } else {
        grid.uncheck(rowKey);
      }
    });

    this.el = el;
    this.changed(props);
  }

  public getElement() {
    return this.el;
  }

  public changed(props: CellRendererProps) {
    const { value, gridDisabled, checkDisabled } = props;

    this.el.checked = Boolean(value);
    this.el.disabled = gridDisabled || checkDisabled;
  }
}
