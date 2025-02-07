import liburl from 'url';
import http from 'http';
import https from 'https';
import libcookie from 'cookie';
import { CookieJar } from 'tough-cookie';

type Primitive = string | number | bigint | boolean | symbol | null | undefined;
type Diff<T, U> = T extends U ? never : T;

export type CookieAgentOptions = {
  jar: CookieJar;
};

interface CookieAgent<BaseAgent extends http.Agent> extends BaseAgent {
  jar: CookieJar;
}

export function createCookieAgent<
  BaseAgent extends http.Agent = http.Agent,
  BaseAgentOptions = unknown,
  BaseAgentConstructorRestParams extends unknown[] = unknown[],
>(
  BaseAgent: new (options: BaseAgentOptions, ...rest: BaseAgentConstructorRestParams) => BaseAgent,
): new (
  options: Diff<BaseAgentOptions, Primitive> & CookieAgentOptions,
  ...rest: BaseAgentConstructorRestParams
) => CookieAgent<BaseAgent>;

export const HttpCookieAgent: new (options: http.AgentOptions & CookieAgentOptions) => CookieAgent<http.Agent>;
export const HttpsCookieAgent: new (options: https.AgentOptions & CookieAgentOptions) => CookieAgent<https.Agent>;
export const MixedCookieAgent: new (
  options: http.AgentOptions & https.AgentOptions & CookieAgentOptions,
) => CookieAgent<https.Agent>;
