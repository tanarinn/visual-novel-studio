/**
 * Minimal IndexedDB wrapper for project storage.
 * IndexedDB has no practical size limit (vs localStorage's ~5MB cap).
 */
const DB_NAME = 'ai-novel-studio'
const DB_VERSION = 1
const STORE_NAME = 'projects'

let _dbPromise = null

function getDB() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = (e) => resolve(e.target.result)
      req.onerror = () => { _dbPromise = null; reject(req.error) }
    })
  }
  return _dbPromise
}

export async function idbSet(key, value) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

export async function idbGet(key) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function idbDelete(key) {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}
