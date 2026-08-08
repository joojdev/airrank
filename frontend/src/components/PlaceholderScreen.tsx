import { Button } from '@/components/ui/button'
import { useGameStore } from '@/store/useGameStore'

export function PlaceholderScreen() {
  const placeholderMessage = useGameStore((state) => state.placeholderMessage)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">Airplane Guessing Game</h1>
      <p className="text-muted-foreground">{placeholderMessage}</p>
      <Button type="button">Placeholder action</Button>
    </main>
  )
}
