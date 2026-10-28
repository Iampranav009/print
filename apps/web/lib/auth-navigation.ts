/** Keep post-auth navigation on this origin, including query strings. */
export function safeAuthNext(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/app/print";
  return value;
}

export function authFailurePath(next: string, error: string): string {
  const destination = safeAuthNext(next);
  const login = destination === "/vendor" || destination.startsWith("/vendor/") || destination.startsWith("/vendor?") ? "/vendor/login" : "/login";
  return `${login}?error=${encodeURIComponent(error)}&next=${encodeURIComponent(destination)}`;
}
