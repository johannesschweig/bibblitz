import { describe, it, expect } from 'vitest'
import { cleanTitle, splitSubtitle, cleanAuthor, cleanContributors, parseYear } from '../../utils/catalogText'

// All strings below are real VÖBB records (scraped 12.10.2026)

describe('cleanTitle', () => {
  it('strips format notes that the media icon already shows', () => {
    expect(cleanTitle('Neuromancer : [Hörbuch] ; [CD]').title).toBe('Neuromancer')
    expect(cleanTitle('Tatort : [DVD-Video]').title).toBe('Tatort')
    expect(cleanTitle('Dune : der Wüstenplanet ; [BD]').title).toBe('Dune : der Wüstenplanet')
    expect(cleanTitle('Gone girl : das perfekte Opfer : [Hörbuch] ; [MP3-CD]').title).toBe('Gone girl : das perfekte Opfer')
    expect(cleanTitle('Mama sag mir, warum : das Kinderlied ; [Medienkombination] ; [Noten + CD]').title).toBe('Mama sag mir, warum : das Kinderlied')
  })

  it('moves the platform into its own field so PS4 and PS5 versions stay distinguishable', () => {
    expect(cleanTitle('Catan : Console Edition : [PlayStation 4]')).toMatchObject({ title: 'Catan : Console Edition', platform: 'PlayStation 4' })
    expect(cleanTitle('Catan : Console Edition : [PlayStation 5]').platform).toBe('PlayStation 5')
    expect(cleanTitle('Cities skylines - Parklife edition : [PlayStation 4] ; [Konsolenspiel] ; [BD]')).toMatchObject({ title: 'Cities skylines - Parklife edition', platform: 'PlayStation 4' })
    expect(cleanTitle('The Legend of Zelda : Twilight Princess ; [Wii] ; [Konsolenspiel]')).toMatchObject({ title: 'The Legend of Zelda : Twilight Princess', platform: 'Wii' })
    expect(cleanTitle('Mario Kart : world : [Nintendo Switch 2]')).toMatchObject({ title: 'Mario Kart : world', platform: 'Nintendo Switch 2' })
  })

  it('keeps a note in the middle of the title and stitches the rest together', () => {
    expect(cleanTitle('Cities : [PlayStation 4] ; [Konsolenspiel]. : Skylines').title).toBe('Cities : Skylines')
  })

  it('leaves no dangling separators in front of a dash or equals sign', () => {
    expect(cleanTitle('Duden - Basiswissen Schule : [Medienkombination] - Englisch : 5. bis 10. Klasse').title).toBe('Duden - Basiswissen Schule - Englisch : 5. bis 10. Klasse')
    expect(cleanTitle('Melodische Übungsstücke : Klavier vierhändig ; opus 149 ; [Noten + CD] = Melodious exercises').title).toBe('Melodische Übungsstücke : Klavier vierhändig ; opus 149 = Melodious exercises')
  })

  it('keeps everything after a colon, it can be part of the name', () => {
    expect(cleanTitle('Mario Kart Live - Home Circuit : Luigi Set').title).toBe('Mario Kart Live - Home Circuit : Luigi Set')
    expect(cleanTitle('Pokemon Labyrinth : Glow in the Dark').title).toBe('Pokemon Labyrinth : Glow in the Dark')
    expect(cleanTitle('Tonies Starterset : (mit Kreativ-Tonie)').title).toBe('Tonies Starterset : (mit Kreativ-Tonie)')
    expect(cleanTitle('Gone Girl : das perfekte Opfer : Roman').title).toBe('Gone Girl : das perfekte Opfer : Roman')
  })

  it('keeps the words of a descriptive note but drops its brackets', () => {
    expect(cleanTitle('The best of Pippi Longstocking : [three books in one]').title).toBe('The best of Pippi Longstocking : three books in one')
    expect(cleanTitle('Duden, einfach klasse in Deutsch : Wissen - Üben - Testen. - 7./8. Klasse. Rechtschreibung : [mit großem Abschlusstest]').title)
      .toBe('Duden, einfach klasse in Deutsch : Wissen - Üben - Testen. - 7./8. Klasse. Rechtschreibung : mit großem Abschlusstest')
    expect(cleanTitle('Hauteville House : [Comic]. - 1. Zelda').title).toBe('Hauteville House : Comic. - 1. Zelda')
  })

  it('turns a bracketed prefix into a subtitle-style prefix, also with a slash inside', () => {
    expect(cleanTitle('[Der Spiegel / Register] Der Spiegel : [Zeitschrift]', { withResponsibility: true }).title).toBe('Der Spiegel / Register : Der Spiegel')
    expect(cleanTitle('[Duden] Alle meine Sinne').title).toBe('Duden : Alle meine Sinne')
    expect(cleanTitle('[Nintendo Switch Lite Konsole] Nintendo Switch Lite').title).toBe('Nintendo Switch Lite Konsole : Nintendo Switch Lite')
  })

  it('cuts the statement of responsibility off detail titles', () => {
    const res = cleanTitle('Yellowface : Roman / Rebecca F. Kuang ; Übersetzung aus dem Englischen von Jasmin Humburg', { withResponsibility: true })
    expect(res.title).toBe('Yellowface : Roman')
    expect(res.responsibility).toBe('Rebecca F. Kuang ; Übersetzung aus dem Englischen von Jasmin Humburg')
  })

  it('does not cut at a slash for search titles', () => {
    expect(cleanTitle('Tag / Nacht').title).toBe('Tag / Nacht')
  })
})

describe('splitSubtitle', () => {
  it('splits at the first spaced colon only', () => {
    expect(splitSubtitle('Berlin : der cool verrückte Reiseführer')).toEqual({ main: 'Berlin', rest: 'der cool verrückte Reiseführer' })
    expect(splitSubtitle('Gone Girl : das perfekte Opfer : Roman')).toEqual({ main: 'Gone Girl', rest: 'das perfekte Opfer : Roman' })
  })

  it('does not split a colon that belongs to the title', () => {
    expect(splitSubtitle('Beethoven: Fünfte Sinfonie : eine Darstellung')).toEqual({ main: 'Beethoven: Fünfte Sinfonie', rest: 'eine Darstellung' })
    expect(splitSubtitle('Neuromancer')).toEqual({ main: 'Neuromancer' })
  })
})

describe('cleanAuthor', () => {
  it.each([
    // books
    ['Rebecca F. Kuang; Übersetzung aus dem Englischen von Jasmin Humburg. - 1. Auflage. - Eichborn', 'Rebecca F. Kuang'],
    ['Georg Christoph Lichtenberg. [Hrsg. von Gerhard Schneider. Ill. von Rolf F. Müller]. - 3. Aufl.. - Eulenspiegel', 'Georg Christoph Lichtenberg'],
    ['Colin Odell & Michelle Le Blanc. - 2. ed., rev. & upd.. - Kamera Books', 'Colin Odell & Michelle Le Blanc'],
    ['Autor: Brian Sibley. [Red.: Nicole Hoffart (verantw.). Übers.: Caspar D. Friedrich]. - Dt.-sprachige erw. Ausg', 'Brian Sibley'],
    ['von Michael Smollin. [Text: Yvonne Triftopoulos]. - Egmont Horizont Verl.', 'Michael Smollin'],
    ['François Rivière. Aus dem Franz. von Gabrielle und Georges Hausemer. - Dt. Erstveröff., 1. Aufl.. - Goldmann', 'François Rivière'],
    ['Ortrun Egelkraut ; Anna Bockhoff ; Ulrike Wiebrecht. - Vista-Point-Verl.', 'Ortrun Egelkraut'],
    ['Remo H. Largo', 'Remo H. Largo'],
    ['Klaus-Jürgen Wrede [[Künstler/in]]. - Schmidt Spiele', 'Klaus-Jürgen Wrede'],
    ['Bilder von Stefanie Harjes ; Texte von Franz Kafka. - FISCHER Sauerländer', 'Stefanie Harjes'],
    ['Text von Katharine Andreou und Glenn Dakin ; Übersetzung: Marta Wajer. - Ne', 'Katharine Andreou und Glenn Dakin'],
    ['hrsg. und bearb. von der Dudenredaktion. [Red.: Werner Scholze-Stubenrecht]', 'Dudenredaktion'],
    ['Astrid Lindgren. Ill. by Tony Ross', 'Astrid Lindgren'],
    ['Astrid Lindgren. Illustrated by Tony Ross. - Oxford', 'Astrid Lindgren'],
    // audio
    ['Joanne K. Rowling. Gelesen von Rufus Beck. - Der HörVerl.', 'Joanne K. Rowling'],
    ['by J. K. Rowling. Read by Stephen Fry. - Complete & unabridged. - Cover to Cover Cassettes', 'J. K. Rowling'],
    ['Regina Leßner. Mit Maren Kroymann ; Marlen Diekhoff.... - Audio-Verl.', 'Regina Leßner'],
    ['Sven Nordqvist [Textverf.]. - Oetinger', 'Sven Nordqvist'],
    // film
    ['Regie: David Fincher. Drehb.: Gillian Flynn. Kamera: Jeff Cronenweth. Musik: Trent Reznor ... Darst.: Ben Affleck', 'David Fincher'],
    ['David Fincher [Regie] ; Ben Affleck [Darst.] ; Rosamund Pike [Darst.]', 'David Fincher'],
    ['Olle Hellbom Regie ; Astrid Lindgren ; Inger Nilsson Schauspieler/in', 'Olle Hellbom'],
    ['Regie, Kamera, Produktion: Nikolaus Geyrhalter ; Katharina Posch Produzent/in', 'Nikolaus Geyrhalter'],
    // games and devices: the publisher
    ['Nintendo', 'Nintendo'],
    ['Heidelberger Spieleverlag [Herausgeber/in]. - Heidelberger Spieleverlag', 'Heidelberger Spieleverlag'],
    ['Boxine Sales DAB', 'Boxine Sales DAB'],
    ['Nintendo Co., Ltd.', 'Nintendo Co., Ltd.'],
    // English and abbreviated secondary credits (scraped 19.10.2026)
    ['by Goethe. From the German by John Anster. - Tauchnitz', 'Goethe'],
    ['Author: J. W. Goethe ; Translator: A. R. Badawi. - Third Edition. - Al Mada', 'J. W. Goethe'],
    ['Joanne K. Rowling. Aus d. Engl. von Klaus Fritz. - 16. Aufl.. - Carlsen', 'Joanne K. Rowling'],
    // the surname is missing in the catalogue, do not show the dangling particle
    ['Johann Wolfgang von. - Kristall', 'Johann Wolfgang'],
    // retellings: the one who retold it, not the illustrator of the retelling
    ['mit Bildern von Christiane Mitzkus. Nacherzählt von Barbara Kindermann. - 1. Aufl.. - Kindermann-Verl.', 'Barbara Kindermann'],
    ['Neu erz. von Barbara Kindermann. Mit Bildern von Klaus Ensikat. - 4.Aufl.. - Kindermann', 'Barbara Kindermann'],
    // the whole statement of responsibility is in brackets (cataloguer's addition)
    ['[Verf.: Frauke Burian. Ill.: Vera Solymosi-Thurzó. Kt. u. Pl.: Eberhart von Harsdorf]. - 21. Aufl., 1991/92. - Polyglott-Verl.', 'Frauke Burian'],
    ['[red. Leitung: Ulrich Kilian ...]. - 8., überarb. und erg. Aufl.. - Dudenverl.', 'Ulrich Kilian'],
    ['[Red.: Christine Berger]. - Companions', 'Christine Berger'],
    ['[Lycée de Garçons de Luxembourg]. - Lycée de Garçons de Luxembourg', 'Lycée de Garçons de Luxembourg']
  ])('%s', (raw, expected) => {
    expect(cleanAuthor(raw)).toBe(expected)
  })

  it('returns nothing when there is no text', () => {
    expect(cleanAuthor('')).toBeUndefined()
    expect(cleanAuthor(undefined)).toBeUndefined()
    expect(cleanAuthor('[Hrsg.]')).toBeUndefined()
  })

  it('does not present an illustrator or translator as the author', () => {
    expect(cleanAuthor('Illustrationen: Katharina Bußhoff. - FISCHER Duden Kinderbuch')).toBeUndefined()
    expect(cleanAuthor('Illustrationen: Katharina Bußhoff ; Text: Anna Meyer. - Verl.')).toBe('Anna Meyer')
    expect(cleanAuthor('transl. by Anna Swanwick. With an introd. and bibliogr. by Karl Breul. - Bell')).toBeUndefined()
  })
})

describe('cleanContributors', () => {
  it('prefers the creator over translators and narrators', () => {
    expect(cleanContributors('Gibson, William [Textdichter/in] Behrens, Alfred [Regie] Scherwenikas, Matthias [Sprecher/in]')).toBe('William Gibson')
    expect(cleanContributors('Lindgren, Astrid [Verfasser/in] Ross, Tony [Illustrator/in]')).toBe('Astrid Lindgren')
  })

  it('never returns only a translator', () => {
    expect(cleanContributors('Humburg, Jasmin [Übersetzer/in]')).toBeUndefined()
  })

  it('flips "Lastname, First" and keeps single names', () => {
    expect(cleanContributors('Largo, Remo H. [Verfasser/in]')).toBe('Remo H. Largo')
    expect(cleanContributors('Campino [Darst.]')).toBe('Campino')
  })
})

describe('parseYear', () => {
  it('takes the first four-digit year', () => {
    expect(parseYear('2025')).toBe('2025')
    expect(parseYear('2019-2021')).toBe('2019')
    expect(parseYear('[2020]')).toBe('2020')
    expect(parseYear('')).toBeUndefined()
  })

  it('takes the last year of a publication line', () => {
    expect(parseYear('München : dtv, 2018', { last: true })).toBe('2018')
    expect(parseYear('München : Piper, Februar 2017', { last: true })).toBe('2017')
    expect(parseYear('Planegg : Koch Media, [2019]', { last: true })).toBe('2019')
    expect(parseYear('Oxford [u.a.] : Oxford University Press', { last: true })).toBeUndefined()
    expect(parseYear(undefined)).toBeUndefined()
  })
})
