import { env } from './env';
import { supabase } from './supabase';

/** RFC 7807 problem from the FastAPI backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly problem: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${env.apiUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const message = String(problem.detail ?? problem.title ?? `Request failed (${res.status})`);
    throw new ApiError(res.status, message, problem);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
