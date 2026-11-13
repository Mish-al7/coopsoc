import type { StoredFile } from "./models";

/** URL that serves an application image through the access-checked /api/files route. */
export function fileUrl(appId: string, slot: string, f: StoredFile | null | undefined): string | undefined {
  if (!f?.key) return undefined;
  const v = f.key.slice(-10).replace(/[^\w-]/g, "");
  return `/api/files/${appId}/${slot}?v=${v}`;
}
