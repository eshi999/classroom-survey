import { describe, expect, it } from 'vitest'
import { matchesCreatedDate } from './dates.ts'

function localIso(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12).toISOString()
}

describe('matchesCreatedDate', () => {
  it('keeps surveys inside the local date range', () => {
    expect(
      matchesCreatedDate(localIso(2026, 8, 17), '2026-08-17', '2026-08-17'),
    ).toBe(true)
    expect(matchesCreatedDate(localIso(2026, 8, 16), '2026-08-17', '')).toBe(
      false,
    )
    expect(matchesCreatedDate(localIso(2026, 8, 18), '', '2026-08-17')).toBe(
      false,
    )
  })
})
