import { Router } from 'express'
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getTemplates,
  buildTemplateSections,
  getAgents,
  type Document,
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

// ── Agents ────────────────────────────────────────────────────────────────────

dataRouter.get('/agents', (_req, res) => {
  res.json(getAgents())
})
