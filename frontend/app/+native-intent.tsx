import { rewriteNativeOpenPath } from '../src/services/notifications/navigation-path';

export function redirectSystemPath({ path }: { path: string }): string {
  return rewriteNativeOpenPath(path);
}
