import {
  isWellFormedTemplateSchema,
  validateAgainstTemplateSchema,
} from './template-schema.util';

describe('validateAgainstTemplateSchema', () => {
  it('passes primitives', () => {
    expect(
      validateAgainstTemplateSchema(
        { name: 'string', age: 'number', ok: 'boolean' },
        { name: 'Ada', age: 3, ok: true },
      ),
    ).toEqual({ valid: true });
  });

  it('reports type mismatch path', () => {
    const r = validateAgainstTemplateSchema(
      { age: 'number' },
      { age: 'thirty' },
    );
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.issues[0]).toEqual({
        path: 'age',
        expected: 'number',
        received: 'string',
      });
    }
  });

  it('treats trailing ? as optional', () => {
    expect(
      validateAgainstTemplateSchema({ nick: 'string?' }, {}),
    ).toEqual({ valid: true });
    expect(
      validateAgainstTemplateSchema({ nick: 'string?' }, { nick: 'foo' }),
    ).toEqual({ valid: true });
    expect(
      validateAgainstTemplateSchema({ nick: 'string?' }, { nick: 5 }).valid,
    ).toBe(false);
  });

  it('reports missing required fields', () => {
    const r = validateAgainstTemplateSchema({ name: 'string' }, {});
    expect(r.valid).toBe(false);
  });

  it('recurses into objects', () => {
    expect(
      validateAgainstTemplateSchema(
        { addr: { city: 'string' } },
        { addr: { city: 'Quito' } },
      ).valid,
    ).toBe(true);
    const r = validateAgainstTemplateSchema(
      { addr: { city: 'string' } },
      { addr: { city: 1 } },
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.issues[0].path).toBe('addr.city');
  });

  it('validates arrays of primitives', () => {
    expect(
      validateAgainstTemplateSchema({ tags: ['string'] }, { tags: ['a', 'b'] })
        .valid,
    ).toBe(true);
    const r = validateAgainstTemplateSchema(
      { tags: ['string'] },
      { tags: ['a', 2] },
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.issues[0].path).toBe('tags[1]');
  });

  it('validates arrays of objects', () => {
    const r = validateAgainstTemplateSchema(
      { items: [{ qty: 'number' }] },
      { items: [{ qty: 1 }, { qty: 'x' }] },
    );
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.issues[0].path).toBe('items[1].qty');
  });

  it('accepts ISO and Date for date type', () => {
    expect(
      validateAgainstTemplateSchema({ d: 'date' }, { d: '2026-04-28' }).valid,
    ).toBe(true);
    expect(
      validateAgainstTemplateSchema({ d: 'date' }, { d: new Date() }).valid,
    ).toBe(true);
    expect(
      validateAgainstTemplateSchema({ d: 'date' }, { d: 'not-a-date' }).valid,
    ).toBe(false);
  });

  it('any accepts anything', () => {
    expect(
      validateAgainstTemplateSchema({ x: 'any' }, { x: { a: 1 } }).valid,
    ).toBe(true);
  });
});

describe('isWellFormedTemplateSchema', () => {
  it('accepts valid shapes', () => {
    expect(
      isWellFormedTemplateSchema({
        a: 'string',
        b: { c: 'number' },
        d: ['boolean'],
      }),
    ).toBe(true);
  });

  it('rejects unknown leaf tag', () => {
    expect(isWellFormedTemplateSchema({ a: 'int' })).toBe(false);
  });

  it('rejects multi-element arrays', () => {
    expect(isWellFormedTemplateSchema({ a: ['string', 'number'] })).toBe(false);
  });
});
