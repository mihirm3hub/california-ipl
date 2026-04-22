/** Best-effort parse for Roanuz / CricketAPI ball-by-ball shapes. */

function pushDeduped(out, seen, ball) {
  if (!ball || typeof ball !== 'object') return
  const id = ball.key ?? ball.id ?? `${ball.overs?.join?.('.')}-${ball.comment?.slice?.(0, 40)}`
  if (seen.has(id)) return
  seen.add(id)
  out.push(ball)
}

function flattenOversArray(overs) {
  if (!Array.isArray(overs)) return []
  const out = []
  for (const o of overs) {
    if (Array.isArray(o?.balls)) out.push(...o.balls)
  }
  return out
}

/**
 * Roanuz ball-by-ball often nests balls under `data.over.balls` (current over only)
 * or lists them in `data.balls`. Collect all paths and dedupe by `key`.
 */
export function extractBallsList(json) {
  if (!json || typeof json !== 'object') return []

  const d = json.data ?? json
  const seen = new Set()
  const out = []

  const sources = [
    d?.balls,
    d?.ball_by_ball,
    d?.over?.balls,
    d?.current_over?.balls,
    d?.last_over?.balls,
    json?.balls,
    json?.ball_by_ball,
    flattenOversArray(d?.overs),
  ]

  for (const arr of sources) {
    if (!Array.isArray(arr)) continue
    for (const b of arr) pushDeduped(out, seen, b)
  }

  return out
}

/** Oldest → newest using overs [over, ball] or numeric key. */
export function sortBallsChronological(balls) {
  return [...balls].sort((a, b) => {
    const oa = a?.overs
    const ob = b?.overs
    if (
      Array.isArray(oa) &&
      Array.isArray(ob) &&
      oa.length >= 2 &&
      ob.length >= 2
    ) {
      if (oa[0] !== ob[0]) return oa[0] - ob[0]
      return oa[1] - ob[1]
    }
    return (Number(a?.key) || 0) - (Number(b?.key) || 0)
  })
}

export function extractLatestBall(json) {
  const raw = extractBallsList(json)
  if (raw.length) {
    const balls = sortBallsChronological(raw)
    return balls[balls.length - 1]
  }
  return json?.data?.last_ball || json?.last_ball || null
}

/** Newest first for UI feed. */
export function extractBallsNewestFirst(json) {
  const balls = sortBallsChronological(extractBallsList(json))
  return [...balls].reverse()
}

export function stripBallCommentHtml(raw) {
  if (raw == null) return ''
  return String(raw)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** overs: [1, 3] → "1.3" */
export function formatBallOvers(ball) {
  if (!ball || typeof ball !== 'object') return ''
  const o = ball.overs
  if (Array.isArray(o) && o.length >= 2) {
    return `${o[0]}.${o[1]}`
  }
  if (ball.overs != null && typeof ball.overs === 'string') {
    return String(ball.overs)
  }
  if (typeof ball.over === 'number' && typeof ball.ball === 'number') {
    return `${ball.over}.${ball.ball}`
  }
  if (ball.over != null && ball.ball != null) {
    return `${ball.over}.${ball.ball}`
  }
  return ''
}

export function getRunsFromBall(ball) {
  if (!ball || typeof ball !== 'object') return null
  const n = Number(
    ball.runs ??
      ball.run ??
      ball.total_runs ??
      ball?.score?.runs ??
      ball?.batting?.runs ??
      ball?.outcome?.runs,
  )
  if (Number.isFinite(n)) return n

  const plain = stripBallCommentHtml(ball.comment || ball.commentary)
  const m = /\b(\d+)\s*runs?\b/i.exec(plain)
  if (m) {
    const r = Number(m[1])
    if (Number.isFinite(r)) return r
  }
  return null
}

function combinedComment(ball) {
  return [
    ball?.commentary,
    ball?.comment,
    ball?.title,
    ball?.description,
    ball?.short_title,
    ball?.message,
  ]
    .filter(Boolean)
    .join(' ')
}

function str(ball) {
  return stripBallCommentHtml(combinedComment(ball)).toLowerCase()
}

function rawComment(ball) {
  return String(ball?.comment || ball?.commentary || '')
}

/**
 * @returns {'four' | 'six' | 'wicket' | null}
 */
export function getBallEventKind(ball) {
  if (!ball || typeof ball !== 'object') return null

  const raw = rawComment(ball)
  const lower = str(ball)

  if (/<b>\s*FOUR\s*<\/b>/i.test(raw) || /<b>4<\/b>/i.test(raw)) return 'four'
  if (/<b>\s*SIX\s*<\/b>/i.test(raw) || /<b>6<\/b>/i.test(raw)) return 'six'

  if (
    /\bwicket\b/i.test(lower) ||
    /bowled|caught|lbw|stumped|run out|hit wicket|hitwicket|retired hurt|obstructing/i.test(
      lower,
    )
  ) {
    return 'wicket'
  }

  if (ball.event === 'six' || ball.ball_type === 'six') return 'six'
  if (ball.event === 'four' || ball.ball_type === 'four') return 'four'

  if (ball.is_boundary === true || ball.boundary === true) {
    const r = getRunsFromBall(ball)
    if (r === 6) return 'six'
    if (r === 4) return 'four'
  }

  const r = getRunsFromBall(ball)
  if (r === 6) return 'six'
  if (r === 4) return 'four'

  if (/\bsix\b|maximum|sailed over/.test(lower)) return 'six'
  if (/\bfour\b|\bboundary\b/.test(lower) && !/\bsix\b/.test(lower)) return 'four'

  return null
}

/**
 * @returns {null | 'four' | 'six'}
 */
export function getBoundaryKind(ball) {
  const k = getBallEventKind(ball)
  if (k === 'four' || k === 'six') return k
  return null
}

export function ballSignature(ball) {
  if (!ball || typeof ball !== 'object') return ''
  const oc = combinedComment(ball)
  return [
    ball.key,
    ball.id,
    ball.ball_key,
    formatBallOvers(ball),
    getRunsFromBall(ball),
    oc.slice(0, 120),
  ]
    .filter((x) => x != null && x !== '')
    .join('|')
}
