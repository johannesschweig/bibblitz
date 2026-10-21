interface GroupableLibrary {
  name: string
  district?: string | null
}

export interface LibraryGroup<T extends GroupableLibrary> {
  title: string
  libraries: T[]
}

const ZLB = 'Zentral- und Landesbibliothek (ZLB)'
const OTHER = 'Mobile und weitere Angebote'

// ZLB first, then the districts A–Z, mobile and special services last; libraries A–Z within a group
export function groupLibraries<T extends GroupableLibrary>(libraries: T[]): LibraryGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const lib of libraries) {
    const title = lib.district || OTHER
    groups.set(title, [...(groups.get(title) ?? []), lib])
  }
  const rank = (title: string) => (title === ZLB ? 0 : title === OTHER ? 2 : 1)
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'de'))
    .map(([title, libs]) => ({ title, libraries: libs.sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
}
