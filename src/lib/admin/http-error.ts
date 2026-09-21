const STATUS_MESSAGES: Record<number, string> = {
  400: 'The request could not be processed. Please review the form and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This change conflicts with existing data.',
  422: 'Please correct the highlighted fields.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong. Please try again.',
};

const SECRET_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /stack/i,
  /prisma/i,
  /sqlite/i,
  /sql /i,
  /at \//,
];

export function publicErrorMessage(
  status?: number,
  backendMessage?: string | null
): string {
  const fallback = STATUS_MESSAGES[status || 500] || STATUS_MESSAGES[500];
  if (!backendMessage) return fallback;

  if (SECRET_PATTERNS.some((pattern) => pattern.test(backendMessage))) {
    return fallback;
  }

  if (backendMessage.length > 180) return fallback;
  return backendMessage;
}

export function networkErrorMessage(): string {
  return 'Unable to reach the server. Please try again.';
}
