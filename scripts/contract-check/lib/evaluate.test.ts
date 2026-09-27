import { evaluate } from './evaluate';

describe('evaluate', () => {
  it('fails a non-2xx with the error code and message', () => {
    const r = evaluate(404, { error: { code: 'not_found', message: 'resource not found' } }, { kind: 'list' }, []);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toEqual(['HTTP 404: not_found resource not found']);
  });
  it('fails when the {data} envelope is missing', () => {
    expect(evaluate(200, [1, 2], { kind: 'list' }, []).status).toBe('FAIL');
  });
  it('fails a list whose data is not an array', () => {
    expect(evaluate(200, { data: {} }, { kind: 'list' }, []).notes).toContain('expected data to be an array');
  });
  it('fails when next_cursor is set because the app reads the first page only', () => {
    const r = evaluate(200, { data: [], next_cursor: 'abc' }, { kind: 'list', allowEmpty: true }, []);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toContain('next_cursor is set; the app reads the first page only');
  });
  it('warns on an empty list unless allowEmpty', () => {
    expect(evaluate(200, { data: [] }, { kind: 'list' }, []).status).toBe('WARN');
    expect(evaluate(200, { data: [] }, { kind: 'list', allowEmpty: true }, []).status).toBe('PASS');
  });
  it('fails when a required key is absent on any item, allowing null values', () => {
    const r = evaluate(200, { data: [{ id: '1', name: null }, { id: '2' }] }, { kind: 'list' }, ['id', 'name']);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toEqual(['missing required keys: name']);
  });
  it('fails a null object payload', () => {
    expect(evaluate(200, { data: null }, { kind: 'object' }, []).notes).toEqual(['data is null']);
  });
  it('fails when the mapper throws', () => {
    const r = evaluate(200, { data: { id: 1 } }, {
      kind: 'object',
      map: () => { throw new Error('boom'); },
    }, []);
    expect(r.notes).toEqual(['mapper threw: boom']);
  });
  it('passes a well-formed object and returns data', () => {
    const r = evaluate(200, { data: { id: 'x' } }, { kind: 'object', map: (d) => d }, ['id']);
    expect(r).toEqual({ status: 'PASS', notes: [], data: { id: 'x' } });
  });
  it('passes a 204 with no body for an object check only when no keys are required', () => {
    expect(evaluate(204, null, { kind: 'object' }, []).status).toBe('PASS');
  });
});
