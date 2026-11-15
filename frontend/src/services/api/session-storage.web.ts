// El navegador usa exclusivamente cookie HttpOnly del backend.
export async function readToken(): Promise<string | null> {
  return null;
}
export async function writeToken(_token: string | null): Promise<void> {
  void _token; /* No token accesible a JavaScript. */
}
