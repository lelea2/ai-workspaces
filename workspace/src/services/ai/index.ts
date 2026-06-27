import type { AIService } from './types'
import { MockAIService } from './mock'
import { ProxyAIService } from './proxy'

let _service: AIService | null = null

export function getAIService(): AIService {
  if (!_service) {
    _service = import.meta.env.VITE_AI_PROVIDER === 'proxy'
      ? new ProxyAIService()
      : new MockAIService()
  }
  return _service
}

export type { AIService } from './types'
