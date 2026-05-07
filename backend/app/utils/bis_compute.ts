import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Cat from '#models/cat'
import Evaluation from '#models/evaluation'
import BisAward from '#models/bis_award'

/** BIV návrh: víťaz pre kombináciu (skupina × pohlavie × class), priorita ring2 → ring1 → nominácia. */
interface BivCandidate {
  catId: number
  category: string | null // typicky kód skupiny / variety
  sex: string | null
  classCode: string | null
  source: 'ring2' | 'ring1' | 'nomination'
  rationale: string
}

async function computeBivCandidates(
  competitionId: number,
  trx?: TransactionClientContract
): Promise<BivCandidate[]> {
  const queryOpts = trx ? { client: trx } : {}

  const cats = await Cat.query(queryOpts).where('competitionId', competitionId)
  const evals = await Evaluation.query(queryOpts).where('competitionId', competitionId)

  const evalsByCat = new Map<number, Evaluation[]>()
  for (const e of evals) {
    const arr = evalsByCat.get(e.catId) ?? []
    arr.push(e)
    evalsByCat.set(e.catId, arr)
  }

  // Group cats by (group × sex × class)
  const buckets = new Map<string, Cat[]>()
  for (const cat of cats) {
    const groups = (cat.groups && cat.groups.length > 0 ? cat.groups : [cat.group]).filter(
      (g): g is string => typeof g === 'string' && g.length > 0
    )
    for (const g of groups) {
      const key = `${g}||${cat.sex ?? ''}||${cat.catClass ?? ''}`
      const arr = buckets.get(key) ?? []
      arr.push(cat)
      buckets.set(key, arr)
    }
  }

  const candidates: BivCandidate[] = []

  for (const [key, bucketCats] of buckets) {
    const [group, sex, classCode] = key.split('||')
    let best: {
      cat: Cat
      score: number
      source: BivCandidate['source']
      rationale: string
    } | null = null

    for (const cat of bucketCats) {
      const evs = evalsByCat.get(cat.id) ?? []
      const ring2 = evs.find((e) => e.round === 'ring2')
      const ring1 = evs.find((e) => e.round === 'ring1')
      const noms = evs.filter((e) => e.round === 'nomination')

      let score = 0
      let source: BivCandidate['source'] = 'nomination'
      let rationale = ''

      if (ring2 && ring2.position) {
        // Ring 2: pozícia 1 najlepšia. Inverzný score (1000 - position).
        score = 1000 - ring2.position
        source = 'ring2'
        rationale = `Ring 2 pozícia #${ring2.position}`
      } else if (ring1 && ring1.accepted) {
        score = 500
        source = 'ring1'
        rationale = `Ring 1: prijatá`
      } else {
        // V nominácii: EX1 = 100, EX2 = 50, EX3 = 25, VG = 10. Tituly +5 each, NomBIS +20.
        const grades = noms
          .map((e) => e.grade)
          .filter((g): g is string => g !== null && g !== undefined)
        if (grades.includes('EX1')) score = 100
        else if (grades.includes('EX2')) score = 50
        else if (grades.includes('EX3')) score = 25
        else if (grades.includes('VG')) score = 10
        score += noms.reduce((acc, e) => acc + (e.titles?.length ?? 0) * 5, 0)
        score += noms.some((e) => e.nomBis) ? 20 : 0
        source = 'nomination'
        const ex = grades.find((g) => g.startsWith('EX')) ?? grades[0] ?? '—'
        rationale = `Nominácia: ${ex}${noms.some((e) => e.nomBis) ? ' + NomBIS' : ''}`
      }

      if (score === 0) continue
      if (!best || score > best.score) {
        best = { cat, score, source, rationale }
      }
    }

    if (best) {
      candidates.push({
        catId: best.cat.id,
        category: group ?? null,
        sex: sex && sex.length > 0 ? sex : null,
        classCode: classCode && classCode.length > 0 ? classCode : null,
        source: best.source,
        rationale: best.rationale,
      })
    }
  }

  return candidates
}

/** Zapíše BIV (pozícia 1) do `bis_awards`; existujúce prepíše len pri `force = true`. */
export async function applyBivAutoCalc(
  competitionId: number,
  options: { force?: boolean; trx?: TransactionClientContract } = {}
): Promise<{ created: number; skipped: number }> {
  const { force = false, trx } = options
  const candidates = await computeBivCandidates(competitionId, trx)

  let created = 0
  let skipped = 0

  for (const cand of candidates) {
    const queryOpts = trx ? { client: trx } : {}
    const existing = await BisAward.query(queryOpts)
      .where('competitionId', competitionId)
      .where('level', 'BIV')
      .where('category', cand.category ?? '')
      .where('sex', cand.sex ?? '')
      .where('classCode', cand.classCode ?? '')
      .where('position', 1)
      .first()

    if (existing) {
      if (!force) {
        skipped++
        continue
      }
      existing.catId = cand.catId
      existing.notes = cand.rationale
      await existing.save()
      created++
    } else {
      await BisAward.create(
        {
          competitionId,
          catId: cand.catId,
          judgeId: null,
          level: 'BIV',
          category: cand.category,
          sex: cand.sex,
          classCode: cand.classCode,
          position: 1,
          notes: cand.rationale,
        },
        queryOpts
      )
      created++
    }
  }

  return { created, skipped }
}

/** Synchronizuje NomBIS záznamy v `bis_awards` z `evaluations.nom_bis`. */
export async function syncNomBisAwards(
  competitionId: number,
  trx?: TransactionClientContract
): Promise<void> {
  const queryOpts = trx ? { client: trx } : {}
  const noms = await Evaluation.query(queryOpts)
    .where('competitionId', competitionId)
    .where('round', 'nomination')
    .where('nomBis', true)
    .preload('cat')
    .preload('judge')

  // Vyčisti staré NomBIS záznamy a vytvor nové podľa aktuálnych hodnotení.
  await BisAward.query(queryOpts)
    .where('competitionId', competitionId)
    .where('level', 'NOM_BIS')
    .delete()

  for (const ev of noms) {
    const cat = ev.cat
    const groups = (cat.groups && cat.groups.length > 0 ? cat.groups : [cat.group]).filter(
      (g): g is string => typeof g === 'string' && g.length > 0
    )
    const category = groups[0] ?? null
    await BisAward.create(
      {
        competitionId,
        catId: cat.id,
        judgeId: ev.judgeId,
        level: 'NOM_BIS',
        category,
        sex: cat.sex,
        classCode: cat.catClass,
        position: 1,
        notes: ev.judge ? `NomBIS od ${ev.judge.name}` : 'NomBIS',
      },
      queryOpts
    )
  }
}
