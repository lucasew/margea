import {
  Environment,
  Network,
  RecordSource,
  Store,
  Observable,
  FetchFunction,
  GraphQLResponse,
} from 'relay-runtime';
import { AuthService, noteTokenScopesFromHeaders } from '../services/auth';
import { rateLimitStore } from '../services/rateLimitStore';
import i18n from '../i18n';
import { reportError } from '../utils/errorReporting';
import {
  abortableSleep,
  createAbortError,
  getAbortSignalFromCacheConfig,
  isAbortError,
} from '../utils/abort';
import { APP_ROUTES } from '../constants';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

async function executeGithubGraphql(
  operationText: string | null | undefined,
  variables: Record<string, unknown>,
  signal: AbortSignal,
): Promise<GraphQLResponse> {
  const token = await AuthService.getToken();
  if (signal.aborted) throw createAbortError();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn(
      'Making unauthenticated request to GitHub API. Rate limits will be more restrictive (60 requests/hour vs 5000 with token).',
    );
  }

  const body = JSON.stringify({
    query: operationText,
    variables,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) throw createAbortError();

    let response: Response;

    try {
      response = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers,
        body,
        signal,
      });
    } catch (err) {
      if (isAbortError(err) || signal.aborted) throw createAbortError();
      if (attempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
        );
        await abortableSleep(delay, signal);
        continue;
      }
      throw err;
    }

    if (response.status === 401) {
      reportError(new Error('401 Unauthorized - logging out user'));
      await AuthService.logout();
      window.location.href = APP_ROUTES.HOME;
      throw new Error(i18n.t('errors.sessionExpired'));
    }

    if (
      (response.status === 429 || response.status === 403) &&
      attempt < MAX_RETRIES
    ) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Rate limited (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
      );
      await abortableSleep(delay, signal);
      continue;
    }

    const json = (await response.json()) as GraphQLResponse & {
      errors?: { message?: string }[];
    };

    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining && reset) {
      rateLimitStore.update(limit, remaining, reset);
    }

    if (token) {
      noteTokenScopesFromHeaders(token, response.headers);
    }

    if (!response.ok) {
      throw new Error(
        i18n.t('errors.network', {
          status: response.status,
          statusText: response.statusText,
        }),
      );
    }

    if ('errors' in json && json.errors) {
      reportError(new Error('GraphQL errors'), { errors: json.errors });
      throw new Error(json.errors[0]?.message || i18n.t('errors.graphql'));
    }

    return json;
  }

  throw new Error(i18n.t('errors.maxRetries'));
}

const fetchQuery: FetchFunction = (operation, variables, cacheConfig) => {
  const outerSignal = getAbortSignalFromCacheConfig(cacheConfig);

  return Observable.create<GraphQLResponse>((sink) => {
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort();

    if (outerSignal?.aborted) {
      sink.error(createAbortError());
      return;
    }
    outerSignal?.addEventListener('abort', onOuterAbort);

    let settled = false;
    executeGithubGraphql(operation.text, variables, controller.signal).then(
      (json) => {
        if (settled || sink.closed) return;
        settled = true;
        sink.next(json);
        sink.complete();
      },
      (err: unknown) => {
        if (settled || sink.closed) return;
        settled = true;
        const error =
          err instanceof Error
            ? err
            : new Error(String(err ?? 'Unknown error'));
        if (controller.signal.aborted || isAbortError(error)) {
          sink.error(createAbortError());
        } else {
          sink.error(error);
        }
      },
    );

    return () => {
      settled = true;
      controller.abort();
      outerSignal?.removeEventListener('abort', onOuterAbort);
    };
  });
};

function createEnvironment() {
  return new Environment({
    network: Network.create(fetchQuery),
    store: new Store(new RecordSource()),
  });
}

export const relayEnvironment = createEnvironment();
