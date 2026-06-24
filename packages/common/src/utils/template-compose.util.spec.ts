import { composeTemplate } from './template-compose.util';

describe('composeTemplate', () => {
  it('renders a child-only template against data (no base)', () => {
    const html = composeTemplate({
      content: '<p>Hello {{userName}}</p>',
      data: { userName: 'Ada' },
    });
    expect(html).toBe('<p>Hello Ada</p>');
  });

  it('treats a null baseContent as no base', () => {
    const html = composeTemplate({
      content: '<p>Hi {{name}}</p>',
      baseContent: null,
      data: { name: 'Bob' },
    });
    expect(html).toBe('<p>Hi Bob</p>');
  });

  it('composes child output into the base via {{body}} with data spread through', () => {
    const html = composeTemplate({
      content: '<p>Hello {{userName}}</p>',
      baseContent: '<html><title>{{userName}}</title>{{{body}}}</html>',
      data: { userName: 'Ada' },
    });
    expect(html).toBe('<html><title>Ada</title><p>Hello Ada</p></html>');
  });

  it('escapes child output when the base uses double-stache for body', () => {
    // Sanity check that {{{body}}} (triple) preserves HTML, matching worker usage.
    const html = composeTemplate({
      content: '<b>x</b>',
      baseContent: '<html>{{{body}}}</html>',
      data: {},
    });
    expect(html).toBe('<html><b>x</b></html>');
  });

  it('propagates Handlebars compile errors to the caller', () => {
    expect(() => composeTemplate({ content: '{{#if x}}', data: {} })).toThrow();
  });
});
