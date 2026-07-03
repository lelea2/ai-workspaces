import type { Document, Section, AgentConfig } from '../../types'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const dataService = {
  getDocuments(): Promise<Document[]> {
    return apiFetch('/api/data/documents')
  },

  getDocument(id: string): Promise<Document> {
    return apiFetch(`/api/data/documents/${id}`)
  },

  createDocument(doc: Document): Promise<Document> {
    return apiFetch('/api/data/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    })
  },

  updateDocument(id: string, patch: Partial<Document>): Promise<Document> {
    return apiFetch(`/api/data/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  },

  deleteDocument(id: string): Promise<void> {
    return apiFetch(`/api/data/documents/${id}`, { method: 'DELETE' })
  },

  getTemplates(): Promise<{ id: string; name: string }[]> {
    return apiFetch('/api/data/templates')
  },

  buildTemplateSections(templateId: string): Promise<Section[]> {
    return apiFetch(`/api/data/templates/${templateId}/sections`)
  },

  saveTemplate(name: string, sections: Section[]): Promise<{ id: string; name: string }> {
    return apiFetch('/api/data/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sections }),
    })
  },

  updateTemplate(id: string, name: string): Promise<{ id: string; name: string }> {
    return apiFetch(`/api/data/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  },

  deleteTemplate(id: string): Promise<void> {
    return apiFetch(`/api/data/templates/${id}`, { method: 'DELETE' })
  },

  getAgents(): Promise<AgentConfig[]> {
    return apiFetch('/api/data/agents')
  },
}
