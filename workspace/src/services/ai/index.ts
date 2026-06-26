import type { AIService } from './types'
import { MockAIService } from './mock'

let _service: AIService | null = null

export function getAIService(): AIService {
  if (!_service) {
    _service = new MockAIService()
  }
  return _service
}

export type { AIService } from './types'
