import type { StoredLesion } from "@/lib/skinlog/types";

/** Preserve capture order when grouping findings from the same photo. */
export function groupLesionsByPhoto(lesions: StoredLesion[]): StoredLesion[][] {
  const order: string[] = [];
  const map = new Map<string, StoredLesion[]>();

  for (const lesion of lesions) {
    if (!map.has(lesion.photo)) {
      order.push(lesion.photo);
      map.set(lesion.photo, []);
    }
    map.get(lesion.photo)!.push(lesion);
  }

  return order.map((photo) => map.get(photo)!);
}
