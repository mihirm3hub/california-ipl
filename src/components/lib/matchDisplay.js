import { safeString } from './date'

export function extractMatchCore(json) {
  return json?.data?.match ?? json?.match ?? json?.data ?? null
}

export function getTeamLabel(teams, side) {
  const t = teams?.[side]
  return {
    code: safeString(t?.code || t?.key || '').toUpperCase() || '—',
    name: safeString(t?.name || t?.alternate_name || ''),
  }
}

/** Best-effort runs display per team (API shapes differ). */
export function getTeamRuns(m, side) {
  if (!m) return null
  const scores = m.scores?.[side] ?? m.score?.[side]
  if (scores && typeof scores === 'object') {
    const r = scores.runs ?? scores.score ?? scores.total
    if (r != null && r !== '') return String(r)
  }
  const flat = m[`${side}_score`] ?? m[`team_${side}_runs`]
  if (flat != null && flat !== '') return String(flat)
  return null
}

export function formatOvers(m, side) {
  const scores = m?.scores?.[side] ?? m?.score?.[side]
  if (scores && typeof scores === 'object') {
    const o = scores.overs ?? scores.overs_str ?? scores.o
    if (o != null && o !== '') return String(o)
  }
  return null
}

/**
 * Human-readable toss line from Match API (Roanuz shapes vary).
 * @returns {string} empty if unknown / not yet done
 */
export function formatTossLine(m) {
  if (!m || typeof m !== 'object') return ''

  if (typeof m.toss === 'string' && m.toss.trim()) {
    return m.toss.trim()
  }
  if (typeof m.toss_str === 'string' && m.toss_str.trim()) {
    return m.toss_str.trim()
  }

  const toss = m.toss
  if (toss && typeof toss === 'object') {
    const winnerKey = toss.winner_key ?? toss.winner ?? toss.winner_team_key
    let winnerName =
      toss.winner_name ||
      toss.winner_team_name ||
      toss.winner_team ||
      ''

    if (!winnerName && winnerKey && m.teams) {
      for (const side of ['a', 'b']) {
        const t = m.teams[side]
        if (!t) continue
        if (
          t.key === winnerKey ||
          t.code === winnerKey ||
          String(t.name) === String(winnerKey)
        ) {
          winnerName = t.name || t.code || winnerKey
          break
        }
      }
    }
    if (!winnerName && winnerKey) winnerName = String(winnerKey)

    const electRaw =
      toss.elected_to ??
      toss.decision ??
      toss.bat_or_bowl ??
      toss.choice ??
      toss.elected
    let elect = safeString(electRaw).toLowerCase()
    if (elect === 'bat' || elect === 'batting') elect = 'bat'
    if (elect === 'bowl' || elect === 'bowling' || elect === 'field') {
      elect = 'field'
    }

    if (winnerName && elect) {
      return `${winnerName} won the toss and elected to ${elect}`
    }
    if (winnerName) {
      return `${winnerName} won the toss`
    }
  }

  const tw = m.toss_winner ?? m.toss_winner_name
  const td = m.toss_decision ?? m.elected_to ?? m.elected
  if (tw && td) {
    return `${safeString(tw)} won the toss and elected to ${safeString(td)}`
  }
  if (tw) {
    return `${safeString(tw)} won the toss`
  }

  return ''
}

/** Match is in a pre-innings toss phase (common CricketAPI statuses). */
export function isTossPhaseStatus(status) {
  const s = safeString(status).toLowerCase()
  return s === 'toss' || s.includes('toss_in') || s.includes('toss ')
}
