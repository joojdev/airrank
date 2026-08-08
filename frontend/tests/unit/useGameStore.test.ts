import { describe, expect, it } from 'vitest'
import { useGameStore } from '@/store/useGameStore'

describe('useGameStore', () => {
  it('exposes a non-empty placeholder message', () => {
    const { placeholderMessage } = useGameStore.getState()
    expect(placeholderMessage.length).toBeGreaterThan(0)
  })
})
