import { expect, test } from 'bun:test';
import { buildApiModel, type EndpointSample } from '../../src/analysis/apiModel';

function sample(over: Partial<EndpointSample> = {}): EndpointSample {
  return {
    method: 'GET',
    url: 'https://api.example.com/api/users/1',
    status: 200,
    requestBody: null,
    responseBody: { id: 1, name: 'Ada' },
    requestHeaders: {},
    ...over,
  };
}

test('clusters calls into templated endpoints', () => {
  const model = buildApiModel([
    sample({ url: 'https://api.example.com/api/users/1' }),
    sample({ url: 'https://api.example.com/api/users/2' }),
  ]);
  expect(model.endpoints).toHaveLength(1);
  expect(model.endpoints[0]!.template).toBe('/api/users/{id}');
  expect(model.endpoints[0]!.calls).toBe(2);
});

test('infers the response schema from all samples of a status', () => {
  const model = buildApiModel([
    sample({ responseBody: { id: 1, name: 'Ada', nickname: 'ada' } }),
    sample({ responseBody: { id: 2, name: 'Alan' } }),
  ]);
  const ok = model.endpoints[0]!.responses.find((r) => r.status === 200)!;
  expect(ok.schema).toMatchObject({ type: 'object', required: ['id', 'name'] });
});

test('keeps distinct statuses as separate response shapes', () => {
  const model = buildApiModel([
    sample({ url: 'https://api.example.com/api/me', status: 200, responseBody: { id: 1 } }),
    sample({
      url: 'https://api.example.com/api/me',
      status: 401,
      responseBody: { error: 'unauthorized' },
    }),
  ]);
  expect(model.endpoints[0]!.responses.map((r) => r.status).sort()).toEqual([200, 401]);
});

test('detects bearer auth from request headers', () => {
  const model = buildApiModel([
    sample({ requestHeaders: { authorization: '<BEARER:a1b2>' } }),
  ]);
  expect(model.endpoints[0]!.auth).toBe('bearer');
});

test('detects cookie auth', () => {
  const model = buildApiModel([sample({ requestHeaders: { cookie: '<COOKIE:x>' } })]);
  expect(model.endpoints[0]!.auth).toBe('cookie');
});

test('infers a request schema for endpoints with bodies', () => {
  const model = buildApiModel([
    sample({
      method: 'POST',
      url: 'https://api.example.com/api/login',
      requestBody: { email: 'a@b.c', password: '<PASSWORD:x>' },
    }),
  ]);
  expect(model.endpoints[0]!.requestSchema).toMatchObject({ type: 'object' });
});

test('derives the base url from the most common api origin', () => {
  const model = buildApiModel([
    sample({ url: 'https://api.example.com/api/users' }),
    sample({ url: 'https://api.example.com/api/stats' }),
  ]);
  expect(model.baseUrl).toBe('https://api.example.com');
});

test('endpoints are ordered by call count', () => {
  const model = buildApiModel([
    sample({ url: 'https://api.example.com/api/a' }),
    sample({ url: 'https://api.example.com/api/b' }),
    sample({ url: 'https://api.example.com/api/b' }),
  ]);
  expect(model.endpoints[0]!.template).toBe('/api/b');
});

test('ignores samples whose body is not JSON', () => {
  const model = buildApiModel([sample({ responseBody: undefined })]);
  expect(model.endpoints[0]!.responses[0]!.schema).toEqual({ type: 'unknown' });
});
