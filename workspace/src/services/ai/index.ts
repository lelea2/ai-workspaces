import type { AIService } from './types'
import { ProxyAIService } from './proxy'

let _service: AIService | null = null

export function getAIService(): AIService {
  if (!_service) {
    _service = new ProxyAIService()
  }
  return _service
}

export type { AIService } from './types'
