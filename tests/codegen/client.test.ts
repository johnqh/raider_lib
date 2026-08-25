import { expect, test } from 'bun:test';
import { generateClient, generateTypes, methodNameFor } from '../../src/codegen/client';
import type { ApiModel } from '../../src/analysis/apiModel';

const MODEL: ApiModel = {
  baseUrl: 'https://api.example.com',
  endpoints: [
    {
      key: 'GET /api/users',
      method: 'GET',
      template: '/api/users',
      calls: 3,
      auth: 'bearer',
      requestSchema: null,
      responses: [
        {
          status: 200,
          count: 3,
          schema: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { id: { type: 'integer' } },
                  required: ['id'],
                },
              },
            },
            required: ['users'],
          },
        },
      ],
    },
    {
      key: 'GET /api/users/{id}',
      method: 'GET',
      template: '/api/users/{id}',
      calls: 2,
      auth: 'bearer',
      requestSchema: null,
      responses: [
        {
          status: 200,
          count: 2,
          schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        },
      ],
    },
    {
      key: 'POST /api/login',
      method: 'POST',
      template: '/api/login',
      calls: 1,
      auth: 'none',
      requestSchema: {
        type: 'object',
        properties: { email: { type: 'string' } },
        required: ['email'],
      },
      responses: [
        {
          status: 200,
          count: 1,
          schema: {
            type: 'object',
            properties: { access_token: { type: 'string' } },
            required: ['access_token'],
          },
        },
      ],
    },
  ],
};

test('derives readable method names', () => {
  expect(methodNameFor('GET', '/api/users')).toBe('getApiUsers');
  expect(methodNameFor('GET', '/api/users/{id}')).toBe('getApiUsersById');
  expect(methodNameFor('POST', '/api/login')).toBe('postApiLogin');
});

test('declares a response type per endpoint', () => {
  const out = generateTypes(MODEL);
  expect(out).toContain('export interface GetApiUsersResponse');
  expect(out).toContain('export interface PostApiLoginRequest');
});

test('generates a method per endpoint with the response type', () => {
  expect(generateClient(MODEL)).toContain(
    'async getApiUsers(): Promise<GetApiUsersResponse>'
  );
});

test('path parameters become typed method arguments', () => {
  const out = generateClient(MODEL);
  expect(out).toContain('getApiUsersById(id: string | number)');
  expect(out).toContain('`${this.baseUrl}/api/users/${id}`');
});

test('endpoints with a request body take a typed body argument', () => {
  const out = generateClient(MODEL);
  expect(out).toContain('postApiLogin(body: PostApiLoginRequest)');
  expect(out).toContain('JSON.stringify(body)');
});

test('bearer endpoints send the Authorization header', () => {
  const out = generateClient(MODEL);
  expect(out).toContain('Authorization');
  expect(out).toContain('this.token');
});

test('the client injects fetch rather than calling global fetch', () => {
  const out = generateClient(MODEL);
  expect(out).toContain('fetchFn');
  expect(out).not.toMatch(/[^.\w]fetch\(/);
});

test('the generated base url comes from the model', () => {
  expect(generateClient(MODEL)).toContain('https://api.example.com');
});

test('non-2xx responses get their own suffixed type', () => {
  const out = generateTypes({
    baseUrl: null,
    endpoints: [
      {
        key: 'GET /api/me',
        method: 'GET',
        template: '/api/me',
        calls: 2,
        auth: 'none',
        requestSchema: null,
        responses: [
          { status: 200, count: 1, schema: { type: 'object', properties: {}, required: [] } },
          { status: 401, count: 1, schema: { type: 'object', properties: {}, required: [] } },
        ],
      },
    ],
  });
  expect(out).toContain('GetApiMeResponse');
  expect(out).toContain('GetApiMeResponse401');
});
