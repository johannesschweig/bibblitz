// Cover ids: where they come from (result rows, ISBN of the detail page) and how they become an image URL.
import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseCoverId, isCoverId, coverIdFor, coverSrc } from '../../utils/cover'
import { coverIdOfRow } from '../../server/utils/cover'

describe('parseCoverId', () => {
  it('reads the id from the VÖBB cover URL of a result row', () => {
    expect(parseCoverId('https://www.voebb.de/vlb/cover/9783257056082/s')).toBe('9783257056082')
  })

  it('reads an EAN the same way', () => {
    expect(parseCoverId('https://www.voebb.de/vlb/cover/4260218857506/s')).toBe('4260218857506')
  })

  it('returns nothing for the placeholder VÖBB shows when there is no cover', () => {
    expect(parseCoverId('/aDISWeb_kopac86/img/cover-bg.svg')).toBeUndefined()
  })

  it('returns nothing for a missing or empty attribute', () => {
    expect(parseCoverId(undefined)).toBeUndefined()
    expect(parseCoverId('')).toBeUndefined()
  })
})

describe('isCoverId', () => {
  it('accepts an ISBN-13/EAN and an ISBN-10', () => {
    expect(isCoverId('9783257056082')).toBe(true)
    expect(isCoverId('389813259X')).toBe(true)
  })

  it('rejects anything else, so no path can be smuggled into the VÖBB URL', () => {
    expect(isCoverId('../../aDISWeb')).toBe(false)
    expect(isCoverId('978-3-257-05608-2')).toBe(false)
    expect(isCoverId('12345')).toBe(false)
    expect(isCoverId('')).toBe(false)
  })
})

describe('coverIdFor', () => {
  it('prefers the id of the result row', () => {
    expect(coverIdFor({ coverId: '9783257056082', isbn: '978-3-8479-0162-4' })).toBe('9783257056082')
  })

  it('falls back to the ISBN of the detail page (hyphens removed)', () => {
    expect(coverIdFor({ isbn: '978-3-8479-0162-4' })).toBe('9783847901624')
  })

  it('turns an ISBN-10 into the ISBN-13 VÖBB uses', () => {
    expect(coverIdFor({ isbn: '3-89813-259-5' })).toBe('9783898132596')
  })

  it('returns nothing when the record has neither', () => {
    expect(coverIdFor({})).toBeUndefined()
    expect(coverIdFor({ isbn: 'keine Angabe' })).toBeUndefined()
  })
})

describe('coverSrc', () => {
  it('points at our own proxy route, never at voebb.de (GDPR)', () => {
    expect(coverSrc('9783257056082', 's')).toBe('/api/cover/9783257056082?size=s')
    expect(coverSrc('9783257056082', 'm')).toBe('/api/cover/9783257056082?size=m')
  })
})

// Trimmed from a real result page: the cover sits in a sibling of the row's grid wrapper
const resultRow = (img: string) => `
  <div class="rList_li rList_cover_active rList_cover_right">
    <div class="rList_cover"><div class="rList_col rList_img">${img}</div></div>
    <div class="rList_grid_wrapper"><div class="rList_grid">
      <div class="rList_col rList_titel"><a href="/aDISWeb/app/prod00?sp=SPROD00&amp;sp=SAK11258843">Die Vorleserin</a></div>
    </div></div>
  </div>`

function rowOf(html: string) {
  const $ = cheerio.load(html)
  return $('.rList_grid_wrapper')
}

describe('coverIdOfRow', () => {
  it('reads the cover id of the row', () => {
    const row = rowOf(resultRow('<img data-src="https://www.voebb.de/vlb/cover/9783257056082/s" class="img-delayed">'))

    expect(coverIdOfRow(row)).toBe('9783257056082')
  })

  it('returns nothing for a row with the placeholder image', () => {
    const row = rowOf(resultRow('<img data-src="/aDISWeb_kopac86/img/cover-bg.svg" class="img-delayed">'))

    expect(coverIdOfRow(row)).toBeUndefined()
  })

  it('returns nothing for a row without a cover element', () => {
    const row = rowOf('<div class="rList_grid_wrapper"><div class="rList_grid"></div></div>')

    expect(coverIdOfRow(row)).toBeUndefined()
  })

  it('does not pick up the cover of the previous row', () => {
    const html = resultRow('<img data-src="https://www.voebb.de/vlb/cover/9783257056082/s">')
      + '<div class="rList_grid_wrapper"><div class="rList_grid"></div></div>'
    const $ = cheerio.load(html)

    expect(coverIdOfRow($('.rList_grid_wrapper').eq(1))).toBeUndefined()
  })
})
