import { Router } from 'express'
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getTemplates,
  buildTemplateSections,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  getAgents,
  getUsers,
  shareDocument,
  unshareDocument,
  type Document,
  type Section,
} from '../db.js'

export const dataRouter = Router()

// ── Documents ─────────────────────────────────────────────────────────────────

dataRouter.get('/documents', (_req, res) => {
  res.json(getDocuments())
})

dataRouter.get('/documents/:id', (req, res) => {
  const doc = getDocument(req.params.id)
  if (!doc) {
    res.status(404).json({ error: `Document '${req.params.id}' not found` })
    return
  }
  res.json(doc)
})

dataRouter.post('/documents', (req, res) => {
  const body = req.body as Partial<Document>
  if (!body.id || !body.title) {
    res.status(400).json({ error: 'id and title are required' })
    return
  }
  if (getDocument(body.id)) {
    res.status(409).json({ error: `Document '${body.id}' already exists` })
    return
  }
  const now = new Date().toISOString()
  const doc: Document = {
    id: body.id,
    title: body.title,
    status: body.status ?? 'draft',
    version: body.version ?? 1,
    updatedAt: body.updatedAt ?? now,
    sections: body.sections ?? [],
    comments: body.comments ?? [],
    suggestions: body.suggestions ?? [],
    events: body.events ?? [],
  }
  createDocument(doc)
  console.log(`[data] created document id=${doc.id} title="${doc.title}"`)
  res.status(201).json(doc)
})

dataRouter.patch('/documents/:id', (req, res) => {
  const { id } = req.params
  const patch = req.body as Partial<Document>
  const ok = updateDocument(id, { ...patch, updatedAt: new Date().toISOString() })
  if (!ok) {
    res.status(404).json({ error: `Document '${id}' not found` })
    return
  }
  console.log(`[data] updated document id=${id}`)
  res.json(getDocument(id))
})

dataRouter.delete('/documents/:id', (req, res) => {
  const ok = deleteDocument(req.params.id)
  if (!ok) {
    res.status(404).json({ error: `Document '${req.params.id}' not found` })
    return
  }
  console.log(`[data] deleted document id=${req.params.id}`)
  res.status(204).send()
})

// ── Templates ─────────────────────────────────────────────────────────────────

dataRouter.get('/templates', (_req, res) => {
  res.json(getTemplates())
})

dataRouter.get('/templates/:id/sections', (req, res) => {
  const sections = buildTemplateSections(req.params.id)
  if (sections.length === 0) {
    res.status(404).json({ error: `Template '${req.params.id}' not found` })
    return
  }
  res.json(sections)
})

dataRouter.post('/templates', (req, res) => {
  const { name, sections } = req.body as { name?: string; sections?: Section[] }
  if (!name?.trim() || !Array.isArray(sections)) {
    res.status(400).json({ error: 'name and sections are required' })
    return
  }
  const tpl = saveTemplate(name.trim(), sections.map(({ heading, body }) => ({ heading, body })))
  console.log(`[data] created template id=${tpl.id} name="${tpl.name}"`)
  res.status(201).json(tpl)
})

dataRouter.patch('/templates/:id', (req, res) => {
  const { name } = req.body as { name?: string }
  if (!name?.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }
  const ok = updateTemplate(req.params.id, { name: name.trim() })
  if (!ok) {
    res.status(404).json({ error: `Template '${req.params.id}' not found` })
    return
  }
  console.log(`[data] updated template id=${req.params.id}`)
  res.json({ id: req.params.id, name: name.trim() })
})

dataRouter.delete('/templates/:id', (req, res) => {
  const ok = deleteTemplate(req.params.id)
  if (!ok) {
    res.status(404).json({ error: `Template '${req.params.id}' not found` })
    return
  }
  console.log(`[data] deleted template id=${req.params.id}`)
  res.status(204).send()
})

// ── Sharing ───────────────────────────────────────────────────────────────────

dataRouter.post('/documents/:id/share', (req, res) => {
  const { userId } = req.body as { userId?: string }
  if (!userId?.trim()) {
    res.status(400).json({ error: 'userId is required' })
    return
  }
  const ok = shareDocument(req.params.id, userId.trim())
  if (!ok) {
    res.status(404).json({ error: `Document '${req.params.id}' not found` })
    return
  }
  console.log(`[data] shared document id=${req.params.id} with user=${userId}`)
  res.json(getDocument(req.params.id))
})

dataRouter.delete('/documents/:id/share/:userId', (req, res) => {
  const ok = unshareDocument(req.params.id, req.params.userId)
  if (!ok) {
    res.status(404).json({ error: `Document '${req.params.id}' not found` })
    return
  }
  console.log(`[data] removed user=${req.params.userId} from document id=${req.params.id}`)
  res.json(getDocument(req.params.id))
})

// ── Users ─────────────────────────────────────────────────────────────────────

dataRouter.get('/users', (_req, res) => {
  res.json(getUsers())
})

// ── Agents ────────────────────────────────────────────────────────────────────

dataRouter.get('/agents', (_req, res) => {
  res.json(getAgents())
})
