import test from 'ava';
import { CookieJar } from 'tough-cookie';
import http from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';

import { createCookieAgent } from '../create_cookie_agent';
import { createTestServerWithProxy } from './helpers';

const HttpProxyCookieAgent = createCookieAgent(HttpProxyAgent);

export function request(url: string, options: http.RequestOptions) {
  const req = http.request(url, options);

  const promise = new Promise<http.IncomingMessage>((resolve, reject) => {
    req.on('response', (res) => {
      res.on('error', (err) => reject(err));
      res.on('data', () => {});
      res.on('end', () => resolve(res));
    });
    req.on('error', (err) => reject(err));
  });
  req.end();

  return { req, promise };
}

test('should set cookies to CookieJar from Set-Cookie header', async (t) => {
  const jar = new CookieJar();

  const { port, proxyPort } = await createTestServerWithProxy([
    (_req, res) => {
      res.setHeader('Set-Cookie', 'key=value');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
  });
  await promise;

  const cookies = await jar.getCookies(`http://localhost:${port}`);
  t.is(cookies.length, 1);
  t.like(cookies[0], { key: 'key', value: 'value' });

  t.plan(2);
});

test('should set cookies to CookieJar from multiple Set-Cookie headers', async (t) => {
  const jar = new CookieJar();

  const { port, proxyPort } = await createTestServerWithProxy([
    (_req, res) => {
      res.setHeader('Set-Cookie', ['key1=value1', 'key2=value2']);
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
  });
  await promise;

  const cookies = await jar.getCookies(`http://localhost:${port}`);
  t.is(cookies.length, 2);
  t.like(cookies[0], { key: 'key1', value: 'value1' });
  t.like(cookies[1], { key: 'key2', value: 'value2' });

  t.plan(3);
});

test('should send cookies from CookieJar', async (t) => {
  const jar = new CookieJar();

  const { port, proxyPort } = await createTestServerWithProxy([
    (req, res) => {
      t.is(req.headers['cookie'], 'key=value');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  await jar.setCookie('key=value', `http://localhost:${port}`);

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
  });
  await promise;

  t.plan(1);
});

test('should send cookies from both a request options and CookieJar', async (t) => {
  const jar = new CookieJar();

  const { port, proxyPort } = await createTestServerWithProxy([
    (req, res) => {
      t.is(req.headers['cookie'], 'key1=value1; key2=value2');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  await jar.setCookie('key1=value1', `http://localhost:${port}`);

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
    headers: { Cookie: 'key2=value2' },
  });
  await promise;

  t.plan(1);
});

test('should send cookies from a request options when the key is duplicated in both a request options and CookieJar', async (t) => {
  const jar = new CookieJar();

  const { port, proxyPort } = await createTestServerWithProxy([
    (req, res) => {
      t.is(req.headers['cookie'], 'key=expected');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  await jar.setCookie('key=notexpected', `http://localhost:${port}`);

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
    headers: { Cookie: 'key=expected' },
  });
  await promise;

  t.plan(1);
});

test('should emit error when CookieJar#getCookies throws error.', async (t) => {
  const jar = new CookieJar();
  jar.getCookies = async () => {
    throw new Error('Error');
  };

  const { port, proxyPort } = await createTestServerWithProxy([
    (_req, res) => {
      res.setHeader('Set-Cookie', 'key=value');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
  });
  await t.throwsAsync(() => promise);

  t.plan(1);
});

test('should emit error when CookieJar#setCookie throws error.', async (t) => {
  const jar = new CookieJar();
  jar.setCookie = async () => {
    throw new Error('Error');
  };

  const { port, proxyPort } = await createTestServerWithProxy([
    (_req, res) => {
      res.setHeader('Set-Cookie', 'key=value');
      res.end();
    },
  ]);
  const agent = new HttpProxyCookieAgent({ jar, host: 'localhost', port: proxyPort });

  const { promise } = request(`http://localhost:${port}`, {
    method: 'GET',
    agent,
  });
  await t.throwsAsync(() => promise);

  t.plan(1);
});
