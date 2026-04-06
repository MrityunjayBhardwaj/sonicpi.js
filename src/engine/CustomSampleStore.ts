/**
 * CustomSampleStore — IndexedDB storage for user-uploaded audio samples.
 *
 * Stores raw ArrayBuffer audio data keyed by sample name (filename without
 * extension, prefixed with "user_"). Persists across sessions.
 */

const DB_NAME = 'spw-custom-samples'
const DB_VERSION = 1
const STORE_NAME = 'samples'

export interface CustomSampleRecord {
  /** Sample name used in code, e.g. "user_mykick" */
  name: string
  /** Original filename, e.g. "mykick.wav" */
  originalName: string
  /** Raw audio file data (WAV/MP3/OGG/FLAC bytes — not decoded PCM) */
  audioData: ArrayBuffer
  /** Upload timestamp */
  uploadedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Save a custom sample to IndexedDB. */
export async function saveCustomSample(record: CustomSampleRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** Load all custom samples from IndexedDB. */
export async function loadAllCustomSamples(): Promise<CustomSampleRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => { db.close(); resolve(request.result) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

/** Delete a custom sample by name. */
export async function deleteCustomSample(name: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** Get all custom sample names (without loading audio data). */
export async function getCustomSampleNames(): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAllKeys()
    request.onsuccess = () => { db.close(); resolve(request.result as string[]) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}
