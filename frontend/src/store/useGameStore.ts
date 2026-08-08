import { create } from 'zustand'

interface GameState {
  placeholderMessage: string
}

export const useGameStore = create<GameState>(() => ({
  placeholderMessage: 'Airplane Guessing Game — boilerplate scaffold',
}))
