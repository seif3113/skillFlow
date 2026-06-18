import { InternalServerErrorException } from '@nestjs/common';
import { tryCatch } from './try-catch';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export async function genericFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { timeout = 10000, headers, ...restOptions } = options;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const { data: res, error } = await tryCatch(
    fetch(url, {
      ...restOptions,
      headers: defaultHeaders,
      signal: AbortSignal.timeout(timeout),
    }),
  );

  if (error) {
    throw new InternalServerErrorException(
      `Failed to reach external service: ${error.message}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new InternalServerErrorException(
      `External service returned ${res.status}: ${body || res.statusText}`,
    );
  }

  const { data: parsed, error: parseError } = await tryCatch<unknown>(
    res.json(),
  );

  if (parseError) {
    throw new InternalServerErrorException(
      `Failed to parse response: ${parseError.message}`,
    );
  }

  return parsed as T;
}
