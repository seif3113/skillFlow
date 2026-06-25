import {
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
    const body = await res.json().catch(() => '');

    if (res.status === 422) {
      if (
        body &&
        typeof body === 'object' &&
        (body as any).signal === 'unsupported_domain'
      ) {
        throw new UnprocessableEntityException(
          (body as any).message || "We don't support this domain at this time.",
        );
      }
      throw new UnprocessableEntityException(
        'You are out of free trials. It will reset every 24 hours.',
      );
    }

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
