export function resolveApiBaseUrl() {
return "https://api.almondwin.com"
}

async function apiFetch(path) {
  const res = await fetch(`${resolveApiBaseUrl()}${path}`)
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text()
  if (!res.ok) {
    const msg =
      typeof data === 'string'
        ? data
        : data?.error || data?.message || res.statusText
    throw new Error(msg)
  }
  return data
}

/**
 * Featured matches (cross-tournament) if your backend supports it.
 * Falls back to tournament-specific featured matches if you pass `tournamentKey`.
 */
export async function getFeaturedMatches({ tournamentKey } = {}) {
  if (tournamentKey) return await getTournamentFeaturedMatches(tournamentKey)
  return await apiFetch('/api/featured-matches')
}

export async function getTournamentFeaturedMatches(tournamentKey) {
  return await apiFetch(
    `/api/tournament/${encodeURIComponent(tournamentKey)}/featured-matches`,
  )
}

export async function getMatch(matchKey) {
  return await apiFetch(`/api/match/${encodeURIComponent(matchKey)}`)
}

export async function getBallByBall(matchKey) {
  return await apiFetch(
    `/api/match/${encodeURIComponent(matchKey)}/ball-by-ball`,
  )
}

function parseMatchTime(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Heuristic: seconds vs milliseconds
    return new Date(v < 10_000_000_000 ? v * 1000 : v)
  }
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    // numeric string epoch?
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n)) return new Date(n < 10_000_000_000 ? n * 1000 : n)
    }
    const d = new Date(s)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

function extractMatchesArray(featuredJson) {
  const j = featuredJson
  const d = j?.data ?? j
  return (
    d?.featuredMatches ??
    d?.featured_matches ??
    d?.matches ??
    d?.data ??
    d?.items ??
    []
  )
}

function extractMatchKey(m) {
  return (
    m?.matchKey ??
    m?.match_key ??
    m?.key ??
    m?.match?.key ??
    m?.match?.match_key ??
    null
  )
}

function statusString(m) {
  return String(
    m?.status ??
      m?.match_status ??
      m?.state ??
      m?.play_status ??
      m?.game_state ??
      '',
  )
    .trim()
    .toLowerCase()
}

export function isCompletedMatchStatus(status) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return false
  return (
    s.includes('complete') ||
    s.includes('completed') ||
    s.includes('finish') ||
    s.includes('result') ||
    s.includes('abandon') ||
    s.includes('cancel') ||
    s.includes('no result') ||
    s.includes('postpon')
  )
}

export function getMatchStatusString(match) {
  return statusString(match)
}

function isCompletedMatch(m) {
  return isCompletedMatchStatus(statusString(m))
}

function extractStartTime(m) {
  return (
    parseMatchTime(
      m?.start_at ??
        m?.start_time ??
        m?.start_date ??
        m?.start ??
        m?.scheduled_at ??
        m?.scheduled_time ??
        m?.timestamp ??
        m?.date_start ??
        m?.match_start ??
        m?.start_at_utc,
    ) || null
  )
}

function extractEndTime(m) {
  return (
    parseMatchTime(
      m?.end_at ??
        m?.end_time ??
        m?.end ??
        m?.date_end ??
        m?.match_end ??
        m?.end_at_utc,
    ) || null
  )
}

function isOngoingMatch(m, now) {
  const s = statusString(m)
  if (isCompletedMatch(m)) return false
  if (
    s.includes('live') ||
    s.includes('ongoing') ||
    s.includes('in progress') ||
    s.includes('inprogress') ||
    s.includes('started') ||
    s.includes('innings') ||
    s.includes('stumps') ||
    s.includes('drinks') ||
    s.includes('break') ||
    s.includes('rain')
  ) {
    return true
  }

  const start = extractStartTime(m)
  if (!start) return false
  const end = extractEndTime(m)
  if (end) return start <= now && now <= end

  // No end time: assume typical window.
  const assumedEnd = new Date(start.getTime() + 8 * 60 * 60 * 1000)
  return start <= now && now <= assumedEnd
}

function isUpcomingMatch(m, now) {
  const s = statusString(m)
  if (isCompletedMatch(m)) return false
  if (
    s.includes('upcoming') ||
    s.includes('scheduled') ||
    s.includes('not started') ||
    s.includes('not_started') ||
    s.includes('preview')
  ) {
    return true
  }
  const start = extractStartTime(m)
  if (!start) return false
  return start > now
}

/**
 * Pick the first matchKey for "ongoing" (preferred) or "upcoming" (fallback).
 */
export function pickFeaturedMatchKey(featuredJson, now = new Date()) {
  const matches = extractMatchesArray(featuredJson)
  if (!Array.isArray(matches) || matches.length === 0) return null

  const ongoing = []
  const upcoming = []

  for (const m of matches) {
    const key = extractMatchKey(m)
    if (!key) continue
    if (isOngoingMatch(m, now)) {
      ongoing.push(m)
      continue
    }
    if (isUpcomingMatch(m, now)) {
      upcoming.push(m)
    }
  }

  const byStartAsc = (a, b) => {
    const ta = extractStartTime(a)?.getTime() ?? Infinity
    const tb = extractStartTime(b)?.getTime() ?? Infinity
    if (ta !== tb) return ta - tb
    return String(extractMatchKey(a) || '').localeCompare(String(extractMatchKey(b) || ''))
  }

  if (ongoing.length) return extractMatchKey(ongoing.sort(byStartAsc)[0])
  if (upcoming.length) return extractMatchKey(upcoming.sort(byStartAsc)[0])

  // Fallback: first non-completed match that has a key.
  for (const m of matches) {
    const k = extractMatchKey(m)
    if (k && !isCompletedMatch(m)) return k
  }

  // Last resort: if all matches are completed, return first keyed match.
  for (const m of matches) {
    const k = extractMatchKey(m)
    if (k) return k
  }
  return null
}

/**
 * Like pickFeaturedMatchKey, but returns the chosen match object too (for status/start time).
 * @returns {{ matchKey: string, status: string, startTime: Date|null, match: any } | null}
 */
export function pickFeaturedMatch(featuredJson, now = new Date()) {
  const matches = extractMatchesArray(featuredJson)
  if (!Array.isArray(matches) || matches.length === 0) return null

  const ongoing = []
  const upcoming = []

  for (const m of matches) {
    const key = extractMatchKey(m)
    if (!key) continue
    if (isOngoingMatch(m, now)) {
      ongoing.push(m)
      continue
    }
    if (isUpcomingMatch(m, now)) {
      upcoming.push(m)
    }
  }

  const byStartAsc = (a, b) => {
    const ta = extractStartTime(a)?.getTime() ?? Infinity
    const tb = extractStartTime(b)?.getTime() ?? Infinity
    if (ta !== tb) return ta - tb
    return String(extractMatchKey(a) || '').localeCompare(
      String(extractMatchKey(b) || ''),
    )
  }

  let chosen = null
  if (ongoing.length) chosen = ongoing.sort(byStartAsc)[0]
  else if (upcoming.length) chosen = upcoming.sort(byStartAsc)[0]
  else {
    // Prefer any non-completed match if status parsing misses variants.
    for (const m of matches) {
      if (extractMatchKey(m) && !isCompletedMatch(m)) {
        chosen = m
        break
      }
    }
    // Last resort if all are completed.
    if (!chosen) {
      for (const m of matches) {
        if (extractMatchKey(m)) {
          chosen = m
          break
        }
      }
    }
  }

  if (!chosen) return null
  return {
    matchKey: String(extractMatchKey(chosen)),
    status: statusString(chosen),
    startTime: extractStartTime(chosen),
    match: chosen,
  }
}

export async function getFeaturedMatchKey({ tournamentKey, now } = {}) {
  const featured = tournamentKey
    ? await getTournamentFeaturedMatches(tournamentKey)
    : await getFeaturedMatches()
  return pickFeaturedMatchKey(featured, now || new Date())
}

export async function getFeaturedMatchSelection({ tournamentKey, now } = {}) {
  const featured = tournamentKey
    ? await getTournamentFeaturedMatches(tournamentKey)
    : await getFeaturedMatches()
  return pickFeaturedMatch(featured, now || new Date())
}

