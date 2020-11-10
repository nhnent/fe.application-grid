import { Range } from '@t/store/selection';
import { RowKey } from '@t/store/data';
import { cls } from '@/helper/dom';
import { applyAliasHeaderCheckbox } from './util';

type ModifiedType = 'createdRows' | 'updatedRows' | 'deletedRows';

export function assertHeaderCheckboxStatus(checked: boolean) {
  applyAliasHeaderCheckbox();

  if (checked) {
    cy.get('@checkbox').should('be.checked');
  } else {
    cy.get('@checkbox').should('not.be.checked');
  }
}

export function assertGridHasRightRowNumber() {
  cy.getRowHeaderCells('_number').each(($el, idx) => {
    cy.wrap($el).should('have.text', `${idx + 1}`);
  });
}

export function assertFocusedCell(columnName: string, rowKey: number) {
  cy.gridInstance().invoke('getFocusedCell').should('have.subset', { columnName, rowKey });
}

export function assertSelectedRange(range: { start: Range; end: Range }) {
  cy.gridInstance().invoke('getSelectionRange').should('be.eql', range);
}

export function assertToggleButtonExpanded(rowKey: RowKey, columnName: string) {
  cy.getCell(rowKey, columnName).within(() => {
    cy.getByCls('tree-extra-content').should('have.class', cls('tree-button-expand'));
  });
}

export function assertToggleButtonCollapsed(rowKey: RowKey, columnName: string) {
  cy.getCell(rowKey, columnName).within(() => {
    cy.getByCls('tree-extra-content').should('not.have.class', cls('tree-button-expand'));
  });
}

export function assertLastPage(page: number) {
  cy.get('.tui-last-child').should('have.text', String(page));
}

export function assertCurrentPage(page: number) {
  cy.get('.tui-is-selected').should('have.text', String(page));
}

export function assertModifiedRowsLength(type: ModifiedType, length: number) {
  cy.gridInstance().invoke('getModifiedRows').its(type).should('have.length', length);
}
