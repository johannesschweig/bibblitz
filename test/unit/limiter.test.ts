import { describe, it, expect } from 'vitest'
import { createLimiter } from '../../utils/limiter'

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('createLimiter', () => {
  it('never runs more than max tasks at once and starts the rest in order', async () => {
    const limit = createLimiter(2)
    let running = 0
    let peak = 0
    const started: number[] = []
    const releases: Array<() => void> = []

    const tasks = [0, 1, 2, 3, 4].map(n => limit(async () => {
      started.push(n)
      running++
      peak = Math.max(peak, running)
      await new Promise<void>(resolve => releases.push(resolve))
      running--
      return n
    }))

    await tick()
    expect(started).toEqual([0, 1])

    // each finished task hands its slot to the next waiting one
    for (let i = 0; i < 5; i++) {
      releases[i]?.()
      await tick()
      await tick()
    }
    expect(await Promise.all(tasks)).toEqual([0, 1, 2, 3, 4])
    expect(started).toEqual([0, 1, 2, 3, 4])
    expect(peak).toBe(2)
  })

  it('frees the slot when a task throws', async () => {
    const limit = createLimiter(1)
    await expect(limit(async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(await limit(async () => 'next')).toBe('next')
  })
})
