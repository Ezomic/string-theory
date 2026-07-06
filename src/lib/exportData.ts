import { getDB } from './db/db'

export interface ExportedData {
  exportedAt: string
  data: Record<string, unknown[]>
}

/** Everything in this guest's local IndexedDB, grouped by store — the entire local data model. */
export async function buildExportData(now: Date = new Date()): Promise<ExportedData> {
  const db = await getDB()
  const data: Record<string, unknown[]> = {}
  for (const storeName of db.objectStoreNames) {
    data[storeName] = await db.getAll(storeName)
  }
  return { exportedAt: now.toISOString(), data }
}

export function exportFileName(now: Date = new Date()): string {
  return `string-theory-export-${now.toISOString().slice(0, 10)}.json`
}

/** Triggers a real browser download of the export as a JSON file. */
export function downloadExport(exported: ExportedData): void {
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName(new Date(exported.exportedAt))
  link.click()
  URL.revokeObjectURL(url)
}
