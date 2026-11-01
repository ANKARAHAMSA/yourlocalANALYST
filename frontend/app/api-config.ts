const configuredApiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

const apiOrigin =
  configuredApiOrigin ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

export function apiUrl(path: string): string {
  if (!apiOrigin) {
    throw new Error(
      'The analytics API is not configured for this deployment. Set NEXT_PUBLIC_API_URL to your deployed FastAPI URL in Vercel, then redeploy.',
    );
  }

  return `${apiOrigin}/api/${path.replace(/^\/+/, '')}`;
}

export function apiError(error: unknown): Error {
  if (error instanceof TypeError) {
    return new Error(
      `Could not reach the analytics API at ${apiOrigin}. Check that the backend is online and allows this site in its CORS settings.`,
    );
  }

  return error instanceof Error ? error : new Error('The analytics request failed.');
}
