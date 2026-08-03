import { afterEach, describe, expect, it, vi } from 'vitest';
import { on } from './delegate';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('on (event delegation)', () => {
  it('calls the handler with the matching element when clicked directly', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button class="btn" data-num="01">go</button>';
    document.body.append(root);
    const handler = vi.fn();
    on(root, 'click', '.btn', handler);

    root.querySelector('.btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    const [, target] = handler.mock.calls[0] as [Event, HTMLElement];
    expect(target.getAttribute('data-num')).toBe('01');
  });

  it('matches via closest() when the click lands on a descendant of the target', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button class="btn"><span class="icon">x</span></button>';
    document.body.append(root);
    const handler = vi.fn();
    on(root, 'click', '.btn', handler);

    root.querySelector('.icon')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler for a click that matches nothing', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="not-a-button">nope</div>';
    document.body.append(root);
    const handler = vi.fn();
    on(root, 'click', '.btn', handler);

    root.querySelector('.not-a-button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps working for elements added after binding (no re-binding needed on re-render)', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const handler = vi.fn();
    on(root, 'click', '.btn', handler);

    root.innerHTML = '<button class="btn">new</button>';
    root.querySelector('.btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores a matching element outside the bound root', () => {
    const root = document.createElement('div');
    const outside = document.createElement('button');
    outside.className = 'btn';
    document.body.append(root, outside);
    const handler = vi.fn();
    on(root, 'click', '.btn', handler);

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('the returned unsubscribe function stops future notifications', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button class="btn">go</button>';
    document.body.append(root);
    const handler = vi.fn();
    const off = on(root, 'click', '.btn', handler);

    off();
    root.querySelector('.btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });
});
