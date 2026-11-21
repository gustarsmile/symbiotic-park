// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { $, el, setText } from '../js/ui/dom.js';

describe('dom', () => {
  it('el sets the class and the text', () => {
    const n = el('p', 'a b', 'hello');
    expect(n.tagName).toBe('P'); expect(n.className).toBe('a b'); expect(n.textContent).toBe('hello');
  });
  it('a newline in the text becomes a br, and no html is interpreted', () => {
    const n = el('div', '', 'one\n<b>two</b>');
    expect(n.querySelectorAll('br')).toHaveLength(1);
    expect(n.querySelector('b')).toBeNull();
    expect(n.textContent).toBe('one<b>two</b>');
  });
  it('a button made by el is type button', () => { expect(el('button').type).toBe('button'); });
  it('$ finds an element by id', () => {
    const n = el('i'); n.id = 'x1'; document.body.appendChild(n);
    expect($('x1')).toBe(n);
  });
  it('setText does not rewrite identical text', () => {
    const n = el('p', '', 'same'), first = n.firstChild;
    setText(n, 'same');
    expect(n.firstChild).toBe(first);
    setText(n, 'other\nline');
    expect(n.textContent).toBe('otherline'); expect(n.querySelectorAll('br')).toHaveLength(1);
    const second = n.firstChild; setText(n, 'other\nline');
    expect(n.firstChild).toBe(second);
  });
});
