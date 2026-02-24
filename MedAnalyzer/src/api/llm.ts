export type LlmSettings = {
  base_url: string
  api_key: string
  model: string
  temperature: number
  top_k: number
  system_prompt: string
}

export type RagDocument = {
  name: string
  size: number
}

export type RagDocumentsResponse = {
  documents: RagDocument[]
  count: number
}

export type RagUploadResponse = {
  saved: number
  uploaded: string[]
}

export type LlmChatRequest = {
  question: string
  top_k?: number
  temperature?: number
  system_prompt?: string
}

export type LlmChatResponse = {
  answer: string
  chunks: number
  contexts: string[]
}

async function parseError(res: Response) {
  const text = await res.text().catch(() => '')
  return text || `${res.status}`
}

export async function getLlmSettings(): Promise<LlmSettings> {
  const res = await fetch('/api/llm/settings')
  if (!res.ok) {
    throw new Error(`获取大模型配置失败：${await parseError(res)}`)
  }
  return (await res.json()) as LlmSettings
}

export async function saveLlmSettings(payload: Partial<LlmSettings>) {
  const res = await fetch('/api/llm/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`保存大模型配置失败：${await parseError(res)}`)
  }
}

export async function listRagDocuments(): Promise<RagDocumentsResponse> {
  const res = await fetch('/api/llm/rag/documents')
  if (!res.ok) {
    throw new Error(`获取 RAG 文档列表失败：${await parseError(res)}`)
  }
  return (await res.json()) as RagDocumentsResponse
}

export async function uploadRagDocuments(files: File[]): Promise<RagUploadResponse> {
  const formData = new FormData()
  files.forEach((file) => formData.append('file', file, file.name))

  const res = await fetch('/api/llm/rag/upload', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    throw new Error(`上传 RAG 文档失败：${await parseError(res)}`)
  }
  return (await res.json()) as RagUploadResponse
}

export async function downloadRagDocuments(): Promise<Blob> {
  const res = await fetch('/api/llm/rag/download')
  if (!res.ok) {
    throw new Error(`下载 RAG 文档失败：${await parseError(res)}`)
  }
  return await res.blob()
}

export async function downloadRagDocument(name: string): Promise<Blob> {
  const res = await fetch(`/api/llm/rag/download/${encodeURIComponent(name)}`)
  if (!res.ok) {
    throw new Error(`下载文档失败：${await parseError(res)}`)
  }
  return await res.blob()
}

export async function deleteRagDocument(name: string) {
  const res = await fetch(`/api/llm/rag/documents/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`删除 RAG 文档失败：${await parseError(res)}`)
  }
}

export async function chatWithRag(payload: LlmChatRequest): Promise<LlmChatResponse> {
  const res = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`问诊失败：${await parseError(res)}`)
  }
  return (await res.json()) as LlmChatResponse
}