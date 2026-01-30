export type Project = {
  uuid: string
  name: string
  createdAt: string
  updatedAt: string
  note?: string
}

export type ProjectConfig = {
  uuid: string
  raw: 'png' | 'npz' | 'dcm' | 'nii' | false
  nii: true | false | 'raw'
  dcm: true | false | 'raw'
  semi: true | false
  'semi-xL': number
  'semi-xR': number
  'semi-yL': number
  'semi-yR': number
  PD: false | 'raw' | 'semi'
  'PD-nii': boolean
  'PD-dcm': boolean
  'PD-3d': boolean
  [key: string]: unknown
}

export class ServerOfflineError extends Error {
  constructor(message = '服务器离线') {
    super(message)
    this.name = 'ServerOfflineError'
  }
}

const API_BASE = '/api/projects'

async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health')
    return res.ok
  } catch {
    return false
  }
}

export async function listProjects(): Promise<Project[]> {
  // 强制使用文档中规定的 info.json 接口；不再回退到 /api/projects
  let res: Response
  try {
    res = await fetch(`${API_BASE}/info.json`)
  } catch (err) {
    const online = await checkServerHealth()
    if (!online) throw new ServerOfflineError()
    throw err
  }
  if (!res.ok) {
    const online = await checkServerHealth()
    if (!online) throw new ServerOfflineError()
    const text = await res.text().catch(() => '')
    throw new Error(`无法获取项目列表：${res.status}${text ? ` — ${text}` : ''}`)
  }

  const data = await res.json().catch(() => null)
  if (!Array.isArray(data)) {
    throw new Error('服务器返回的项目列表格式不正确，预期为 JSON 数组')
  }

  return (data as Project[]).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
}

export async function getProject(uuid: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/${uuid}`)
  if (!res.ok) throw new Error('无法获取项目: ' + res.status)
  return (await res.json()) as Project
}

export async function getProjectJson(uuid: string): Promise<ProjectConfig> {
  const res = await fetch(`${API_BASE}/${uuid}/project.json`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`无法获取 project.json：${res.status}${text ? ` — ${text}` : ''}`)
  }
  return (await res.json()) as ProjectConfig
}

export async function deleteProject(uuid: string): Promise<Response> {
  return await fetch(`${API_BASE}/${uuid}`, { method: 'DELETE' })
}

export async function createProject(payload: { name: string; note?: string }): Promise<Project> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('创建项目失败：' + (text || res.status))
  }
  return (await res.json()) as Project
}

export async function updateProject(uuid: string, payload: { note?: string }): Promise<Project> {
  const res = await fetch(`${API_BASE}/${uuid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('更新项目失败：' + (text || res.status))
  }
  return (await res.json()) as Project
}

export async function updateProjectNote(uuid: string, note: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/${uuid}/note`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error('更新备注失败：' + (text || res.status))
  }
  return (await res.json()) as Project
}
