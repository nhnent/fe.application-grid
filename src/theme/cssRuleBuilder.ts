/**
 * @fileoverview CSS Rule string builder
 * @author NHN. FE Development Lab <dl_javascript@nhn.com>
 */

import { isString, isBoolean } from '../helper/common';
import { OptScrollbarStyle, OptCellStyle } from './../types.d';

type StringOrUndefinedType = string | undefined;

/**
 * create css rule string and returns it
 * @module {theme/cssBuilder}
 * @param {String} selector - css selector
 * @param {String} property - css property
 * @param {String} value - css value
 * @ignore
 */
class CSSRuleBuilder {
  constructor(selector: string) {
    this.init(selector);
  }

  _selector: string = '';
  _propValues: string[] = [];

  init(selector: string) {
    if (!isString(selector) || !selector) {
      throw new Error('The Selector must be a string and not be empty.');
    }
    this._selector = selector;
    this._propValues = [];
  }

  /**
   * Add a set of css property and value.
   * @param {String} property - css property
   * @param {String} value - css value
   * @returns {CSSRuleBuilder}
   */
  add(property: string, value?: string): CSSRuleBuilder {
    if (value) {
      this._propValues.push(`${property}:${value}`);
    }

    return this;
  }

  /**
   * Shortcut for add('border-color', value)
   * @param {String} value - css value
   * @returns {CSSRuleBuilder}
   */
  border(value?: string): CSSRuleBuilder {
    return this.add('border-color', value);
  }

  /**
   * Add a border-width style to the rule.
   * @param {Object} options - visible options
   * @param {Boolean} [options.showVerticalBorder] - whether the vertical border is visible
   * @param {Boolean} [options.showHorizontalBorder] - whether the horizontal border is visible
   * @returns {CSSRuleBuilder}
   */
  borderWidth(options: OptCellStyle): CSSRuleBuilder {
    const vertical = options.showVerticalBorder;
    const horizontal = options.showHorizontalBorder;
    let value: '1px' | '0';

    if (isBoolean(vertical)) {
      value = vertical ? '1px' : '0';
      this.add('border-left-width', value).add('border-right-width', value);
    }

    if (isBoolean(horizontal)) {
      value = horizontal ? '1px' : '0';
      this.add('border-top-width', value).add('border-bottom-width', value);
    }

    return this;
  }

  /**
   * Add a vertical border style to the rule.
   * @param {Object} options - visible options
   * @param {Boolean} [options.showVerticalBorder] - whether the vertical border is visible
   * @param {String} position - Position of the vertical border ('right' or 'left')
   * @returns {CSSRuleBuilder}
   */
  verticalBorderStyle(options: OptCellStyle, position: StringOrUndefinedType): CSSRuleBuilder {
    const vertical = options.showVerticalBorder;
    let value: 'solid' | 'hidden';

    if (isBoolean(vertical) && position) {
      value = vertical ? 'solid' : 'hidden';

      this.add(`border-${position}-style`, value);
    }

    return this;
  }

  /**
   * Shortcut for add('background-color', value)
   * @param {String} value - css value
   * @returns {CSSRuleBuilder}
   */
  bg(value?: string): CSSRuleBuilder {
    return this.add('background-color', value);
  }

  /**
   * Shortcut for add('color', value)
   * @param {String} value - css value
   * @returns {CSSRuleBuilder}
   */
  text(value?: string): CSSRuleBuilder {
    return this.add('color', value);
  }

  /**
   * Create a CSS rule string with a selector and prop-values.
   * @returns {String}
   */
  build() {
    let result = '';

    if (this._propValues.length) {
      result = `${this._selector}{${this._propValues.join(';')}}`;
    }

    return result;
  }
}

/**
 * Creates new Builder instance.
 * @param {String} selector - selector
 * @returns {CSSRuleBuilder}
 */
export function create(selector: string) {
  return new CSSRuleBuilder(selector);
}

/**
 * Creates a new Builder instance with a class name selector.
 * @param {String} className - class name
 * @returns {CSSRuleBuilder}
 */
export function createClassRule(className: string): CSSRuleBuilder {
  return create(`.${className}`);
}

/**
 * Creates a new Builder instance with a composed class name.
 * @param {String} selector - selector to compose class names
 * @param {Array} classNames - class name list
 * @returns {CSSRuleBuilder}
 */
export function createClassComposeRule(selector: string, classNames: string[]): CSSRuleBuilder {
  return create(`.${classNames.join(selector)}`);
}

/**
 * Creates an array of new Builder instances for the -webkit-scrollbar styles.
 * @param {String} selector - selector
 * @param {Object} options - options
 * @returns {Array.<CSSRuleBuilder>}
 */
export function createWebkitScrollbarRules(
  selector: string,
  options: OptScrollbarStyle
): Array<CSSRuleBuilder> {
  return [
    create(`${selector} ::-webkit-scrollbar`).bg(options.background),
    create(`${selector} ::-webkit-scrollbar-thumb`).bg(options.thumb),
    create(`${selector} ::-webkit-scrollbar-thumb:hover`).bg(options.active)
  ];
}

/**
 * Creates a builder instance for the IE scrollbar styles.
 * @param {String} selector - selector
 * @param {Object} options - options
 * @returns {CSSRuleBuilder}
 */
export function createIEScrollbarRule(
  selector: string,
  options: OptScrollbarStyle
): CSSRuleBuilder {
  const bgProps = [
    'scrollbar-3dlight-color',
    'scrollbar-darkshadow-color',
    'scrollbar-track-color',
    'scrollbar-shadow-color'
  ];
  const thumbProps = ['scrollbar-face-color', 'scrollbar-highlight-color'];
  const ieScrollbarRule = create(selector);

  bgProps.forEach(function(prop) {
    ieScrollbarRule.add(prop, options.background);
  });
  thumbProps.forEach(function(prop) {
    ieScrollbarRule.add(prop, options.thumb);
  });
  ieScrollbarRule.add('scrollbar-arrow-color', options.active);

  return ieScrollbarRule;
}
/**
 * Build all rules and returns the concatenated string.
 * @param {Array.<Rule>} rules - rule builders
 * @returns {String}
 */
export function buildAll(rules: CSSRuleBuilder[]): string {
  return rules
    .map(function(rule) {
      return rule.build();
    })
    .join('');
}
