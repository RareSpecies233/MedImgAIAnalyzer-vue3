import { createTempProject, getProjectJson } from '../api/projects'

const TEMP_UUID_KEY = 'medanalyzer-temp-uuid'

function readStoredTempUUID() {
  try {
    return window.sessionStorage.getItem(TEMP_UUID_KEY) || ''
  } catch {
    return ''
  }
}

function writeStoredTempUUID(tempUUID: string) {
  try {
    window.sessionStorage.setItem(TEMP_UUID_KEY, tempUUID)
  } catch {
    // ignore storage failures
  }
}

export function clearStoredTempUUID() {
  try {
    window.sessionStorage.removeItem(TEMP_UUID_KEY)
  } catch {
    // ignore storage failures
  }
}

export async function ensureTempUUID() {
  const existing = readStoredTempUUID()
  if (existing) {
    try {
      await getProjectJson(existing, 'temp')
      return existing
    } catch {
      // stale temp uuid, recreate below
    }
  }

  const created = await createTempProject('临时快速项目')
  const tempUUID = created.tempUUID
  writeStoredTempUUID(tempUUID)
  return tempUUID
}
