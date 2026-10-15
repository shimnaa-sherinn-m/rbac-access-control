import Permission from '../models/Permission.js';
import { MODULES } from './catalog.js';

export async function syncPermissionCatalog() {
  await Permission.bulkWrite(
    MODULES.map((m, index) => ({
      updateOne: {
        filter: { module: m.module },
        update: { $set: { label: m.label, actions: m.actions, order: index } },
        upsert: true,
      },
    })),
  );
}
