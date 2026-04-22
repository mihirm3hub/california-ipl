// Component that spawns almond entities around the user

import { getBallByBall, getFeaturedMatchSelection } from './lib/cricketApi'
import {
  ballSignature,
  extractLatestBall,
  getBallEventKind,
  getRunsFromBall,
  stripBallCommentHtml,
} from './lib/ballEvents'

export const entitySwapnerComponent = {
  schema: {
    min: { default: 6 },
    max: { default: 10 },
  },
  init() {
    this.prompt = document.getElementById('promptText')
    this.scoreEl = document.getElementById('scoreText')
    this.camera = document.getElementById('camera')
    this.popup = document.getElementById('almondPopup')
    this.popupOkBtn = document.getElementById('popupOkBtn')
    this.selectedAlmond = null
    this.bbIntervalId = null
    this.bbStatusIntervalId = null
    this.idleSpawnIntervalId = null
    this.prevBallSig = ''
    this.bbMatchKey = ''
    this.bbMatchLabel = ''
    this.bbJson = null
    this.bbError = ''
    this.bbNotStarted = false
    this.score = 0
    this.nextSpawnMeta = null

    this.hidePopup = this.hidePopup.bind(this)

    if (this.popupOkBtn) {
      this.popupOkBtn.addEventListener('click', this.hidePopup)
    }

    if (this.prompt) {
      this.prompt.textContent = 'Waiting for match events…'
    }
    this.renderScore()

    this.spawnIntervalId = null

    // (1) Almond appears every 30s and disappears in 10s (10 points).
    this.idleSpawnIntervalId = window.setInterval(() => {
      console.log('[almond] idle spawn tick')
      this.spawnIdleAlmond()
    }, 3000)

    console.log('[bb] init: starting featured match streaming')
    this.startBallByBallStreaming()
  },
  renderScore() {
    console.log('[score] rendering score:', this.score)
    if (!this.scoreEl) return
    console.log('[score] scoreEl:', this.scoreEl)
    console.log('[score] score:', this.score)
    this.scoreEl.textContent = `Score: ${this.score}`
    console.log('[score] scoreEl.textContent:', this.scoreEl.textContent)
  },
  tagLatestSpawnedAlmond(meta) {
    if (!meta || !this.el?.sceneEl) return
    try {
      const all = this.el.sceneEl.querySelectorAll('a-entity[gltf-model="#almondModel"]')
      if (!all || !all.length) return
      const el = all[all.length - 1]
      el.dataset.spawnType = meta.type
      el.dataset.points = String(meta.points)
      el.dataset.despawnMs = String(meta.despawnMs)
      console.log('[almond] tagged spawn:', meta)
      this.scheduleAutoDespawn(el, meta.despawnMs)
    } catch (e) {
      console.warn('[almond] failed tagging spawn:', e)
    }
  },
  scheduleAutoDespawn(el, ms) {
    if (!el) return
    const dur = Number(ms)
    if (!Number.isFinite(dur) || dur <= 0) return

    if (el.__despawnTimer) {
      window.clearTimeout(el.__despawnTimer)
      el.__despawnTimer = null
    }

    el.__despawnTimer = window.setTimeout(() => {
      // If it was already tapped/removed, skip.
      if (!el.parentNode) return
      console.log('[almond] auto-despawn:', {
        type: el.dataset?.spawnType,
        points: el.dataset?.points,
      })
      this.despawnElement(el)
    }, dur)
  },
  despawnElement(el) {
    if (!el || !el.parentNode) return

    // prevent re-tap + shrink out then remove (same pattern as hidePopup)
    el.classList.remove('cantap')
    el.setAttribute('animation__shrink', {
      property: 'scale',
      to: '0 0 0',
      easing: 'easeOutQuad',
      dur: 400,
    })

    el.addEventListener(
      'animationcomplete__shrink',
      () => {
        if (el.parentNode) el.parentNode.removeChild(el)
      },
      { once: true },
    )
  },
  spawnIdleAlmond() {
    if (!this.el?.sceneEl) return
    const meta = { type: 'idle', points: 10, despawnMs: 10000 }
    this.spawnAlmondAroundUser()
    this.tagLatestSpawnedAlmond(meta)
  },
  spawnMatchEventAlmond() {
    if (!this.el?.sceneEl) return
    const meta = { type: 'match', points: 50, despawnMs: 20000 }
    this.spawnAlmondAroundUser()
    this.tagLatestSpawnedAlmond(meta)
  },
  async startBallByBallStreaming(pollMs = 5000) {
    this.stopBallByBallStreaming()
    this.bbError = ''
    this.bbNotStarted = false

    try {
      if (this.prompt) this.prompt.textContent = 'Finding featured match…'
      console.log('[bb] fetching featured matchKey…')
      const sel = await getFeaturedMatchSelection({ "tournamentKey": "a-rz--cricket--bcci--iplt20--2026-ZGwl", now: new Date() })
      const matchKey = sel?.matchKey || ''
      if (!matchKey) throw new Error('No upcoming/ongoing match found')
      this.bbMatchKey = matchKey
      this.bbMatchLabel = String(
        sel?.match?.short_name ||
        sel?.match?.shortName ||
        sel?.match?.name ||
        sel?.match?.title ||
        sel?.match?.match_name ||
        '',
      ).trim()
      if (!this.bbMatchLabel) this.bbMatchLabel = matchKey
      const status = String(sel?.status || '').toLowerCase()
      this.bbNotStarted = status === 'not_started'
      console.log(
        '[bb] selected matchKey:',
        matchKey,
        'label:',
        this.bbMatchLabel,
        'status:',
        status,
      )

      if (this.bbNotStarted) {
        console.log(
          '[bb] match not started; skipping ball-by-ball until status changes',
        )
        this.bbJson = null
        this.renderBallByBallStatus()

        // No ball-by-ball polling if the match is not started.
        // Instead, periodically re-check featured match status.
        this.bbStatusIntervalId = window.setInterval(async () => {
          try {
            console.log('[bb] status tick: re-checking featured match…')
            const nextSel = await getFeaturedMatchSelection({ "tournamentKey": "a-rz--cricket--bcci--iplt20--2026-ZGwl", now: new Date() })
            const nextStatus = String(nextSel?.status || '').toLowerCase()
            console.log('[bb] status tick:', nextStatus)
            if (nextStatus !== 'not_started') {
              console.log('[bb] match started (status changed); starting ball-by-ball')
              this.startBallByBallStreaming(pollMs)
            }
          } catch (e) {
            console.warn('[bb] status tick failed:', e)
          }
        }, pollMs)
        return
      } else {
        if (this.prompt) this.prompt.textContent = `Match: ${this.bbMatchLabel} (loading…)`
        console.log('[bb] fetching ball-by-ball (initial)…')
        const json = await getBallByBall(matchKey)
        this.bbJson = json
        console.log('[bb] ball-by-ball loaded (initial)')
        this.renderBallByBallStatus()
      }
    } catch (e) {
      this.bbError = e?.message || 'Failed to load ball-by-ball'
      console.error('[bb] failed to start streaming:', e)
      this.renderBallByBallStatus()
      return
    }

    console.log('[bb] polling started, every', pollMs, 'ms')
    this.bbIntervalId = window.setInterval(async () => {
      try {
        console.log('[bb] polling tick: fetching ball-by-ball…')
        const json = await getBallByBall(this.bbMatchKey)
        this.bbJson = json
        this.bbError = ''
        console.log('[bb] polling tick: success')
        this.renderBallByBallStatus()
      } catch (e) {
        this.bbError = e?.message || 'Failed to refresh ball-by-ball'
        console.warn('[bb] polling tick: failed:', e)
        this.renderBallByBallStatus()
      }
    }, pollMs)
  },
  stopBallByBallStreaming() {
    if (this.bbIntervalId) {
      window.clearInterval(this.bbIntervalId)
      this.bbIntervalId = null
      console.log('[bb] polling stopped')
    }
    if (this.bbStatusIntervalId) {
      window.clearInterval(this.bbStatusIntervalId)
      this.bbStatusIntervalId = null
      console.log('[bb] status polling stopped')
    }
  },
  renderBallByBallStatus() {
    if (!this.prompt) return

    if (this.bbError) {
      this.prompt.textContent = `BB error: ${this.bbError}`
      return
    }

    const latest = extractLatestBall(this.bbJson)
    const over = latest?.overs?.join?.('.') ?? latest?.over ? `${latest.over}.${latest.ball ?? ''}` : ''
    const runs =
      latest?.runs ??
      latest?.run ??
      latest?.total_runs ??
      latest?.score?.runs ??
      ''
    const comment = stripBallCommentHtml(latest?.comment || latest?.commentary || '')
    const meta = this.bbMatchLabel
      ? `Match: ${this.bbMatchLabel}`
      : this.bbMatchKey
        ? `Match: ${this.bbMatchKey}`
        : 'Match: —'

    if (!latest) {
      if (this.bbNotStarted) {
        this.prompt.textContent = `${meta} · Match not started`
      } else {
        this.prompt.textContent = `${meta} (no balls yet)`
      }
      return
    }

    // If we got a ball, match has started.
    this.bbNotStarted = false

    const sig = ballSignature(latest)
    if (sig && sig !== this.prevBallSig) {
      this.prevBallSig = sig
      const kind = getBallEventKind(latest)
      const runsNum = getRunsFromBall(latest)
      const shouldSpawn =
        kind === 'wicket' || kind === 'four' || kind === 'six' || runsNum === 2
      if (shouldSpawn) {
        console.log('[bb] spawn trigger:', { kind, runs: runsNum })
        // (2) Almond appears as per IPL API logic and disappears after 20s (50 points).
        this.spawnMatchEventAlmond()
      } else {
        console.log('[bb] no spawn:', { kind, runs: runsNum })
      }
    }

    const parts = [`Score: ${this.score}`, meta]
    //if (over) parts.push(`Over ${String(over).replace(/\.$/, '')}`)
    if (runs !== '') parts.push(`${runs} runs`)
    if (comment) parts.push(comment.slice(0, 120))
    this.prompt.textContent = parts.join(' · ')
  },
  remove() {
    if (this.spawnIntervalId) {
      clearInterval(this.spawnIntervalId)
      this.spawnIntervalId = null
    }
    if (this.idleSpawnIntervalId) {
      window.clearInterval(this.idleSpawnIntervalId)
      this.idleSpawnIntervalId = null
    }
    this.stopBallByBallStreaming()

    if (this.popupOkBtn) {
      this.popupOkBtn.removeEventListener('click', this.hidePopup)
    }

  },
  showPopup() {
    if (!this.popup) {
      return
    }

    this.popup.classList.remove('hidden')
  },
  hidePopup() {
    if (!this.popup) {
      return
    }

    this.popup.classList.add('hidden')

    if (this.selectedAlmond) {
      const selectedElement = this.selectedAlmond
      this.selectedAlmond = null

      if (selectedElement.__despawnTimer) {
        window.clearTimeout(selectedElement.__despawnTimer)
        selectedElement.__despawnTimer = null
      }

      // Score is awarded on tap; popup OK only dismisses.

      selectedElement.classList.remove('cantap')
      selectedElement.setAttribute('animation__shrink', {
        property: 'scale',
        to: '0 0 0',
        easing: 'easeOutQuad',
        dur: 400,
      })

      selectedElement.addEventListener('animationcomplete__shrink', () => {
        if (selectedElement.parentNode) {
          selectedElement.parentNode.removeChild(selectedElement)
        }
      }, { once: true })

      return
    }

  },
  onAlmondSelected(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }

    this.selectedAlmond = event && event.currentTarget ? event.currentTarget : null

    // Award points immediately on tap (prevents "score not updating" if user doesn't hit OK).
    try {
      if (this.selectedAlmond && this.selectedAlmond.dataset) {
        if (this.selectedAlmond.dataset.claimed !== '1') {
          const pts = Number(this.selectedAlmond.dataset.points || 0)
          if (Number.isFinite(pts) && pts > 0) {
            this.selectedAlmond.dataset.claimed = '1'
            this.score += pts
            console.log('[score] +', pts, '=>', this.score)
            this.renderScore()
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Update popup copy with points.
    try {
      const pts = Number(this.selectedAlmond?.dataset?.points || 0)
      const p = this.popup?.querySelector?.('.popup-card p')
      if (p) {
        p.textContent = pts ? `+${pts} points` : 'You clicked the almond successfully.'
      }
    } catch (e) {
      // ignore
    }

    this.renderBallByBallStatus()
    this.showPopup()
  },
  spawnAlmondAroundUser() {
    if (!this.camera) {
      return
    }

    const cameraPosition = this.camera.object3D.position
    const radius = 50
    const randomAngle = Math.random() * Math.PI * 2
    const randomDistance = Math.sqrt(Math.random()) * radius
    const spawnX = cameraPosition.x + Math.cos(randomAngle) * randomDistance
    const spawnZ = cameraPosition.z + Math.sin(randomAngle) * randomDistance

    const parentElement = document.createElement('a-entity')
    parentElement.setAttribute('position', `${spawnX} 0.1 ${spawnZ}`)
    parentElement.setAttribute('no-cull', '')
    // parentElement.setAttribute('look-at', `[camera]`)

    const newElement = document.createElement('a-entity')
    // newElement.setAttribute('position', `${spawnX} 0.1 ${spawnZ}`)
    newElement.setAttribute('look-at', `[camera]`)
    const randomYRotation = Math.random() * 360
    // newElement.setAttribute('rotation', `0 ${randomYRotation} 0`)
    newElement.setAttribute('rotation', `0 0 0`)

    const randomScale = Math.floor(Math.random() * (Math.floor(this.data.max) - Math.ceil(this.data.min)) + Math.ceil(this.data.min))

    newElement.setAttribute('visible', 'false')
    newElement.setAttribute('scale', '0.0001 0.0001 0.0001')

    // newElement.setAttribute('shadow', {
    //   receive: false,
    // })

    newElement.setAttribute('gltf-model', '#almondModel')



    newElement.addEventListener('click', (event) => {
      this.onAlmondSelected(event)
    })
    newElement.addEventListener('touchstart', (event) => {
      this.onAlmondSelected(event)
    })

    this.el.sceneEl.appendChild(parentElement)
    parentElement.appendChild(newElement)

    newElement.insertAdjacentHTML('beforeend', `
        <a-entity
          id="sparkleVideo"
          play-video="video: #sparkle-video; autoplay: true"
          material="shader: chromakey; src: #sparkle-video; color: 0.1 0.1 0.1; side: double; depthTest: true;"
          geometry="primitive: plane; height: 1.024 width: 1.024;"
          scale=""
          position="0 0 -0.2"
          rotation="0 0 0">
        </a-entity>
      `)

    parentElement.insertAdjacentHTML('beforeend', `
        <a-entity
          id="alphaVideo"
          play-video="video: #alpha-video; autoplay: true"
          material="shader: chromakey; src: #alpha-video; color: 0.1 0.1 0.1; side: double; depthTest: true;"
          geometry="primitive: plane; height: 1.024 width: 1.024;"
          scale="4 4 4"
          position="0 .4 0"
          rotation="90 0 0">
        </a-entity>
      `)

    newElement.addEventListener('model-loaded', () => {
      // Once the model is loaded, we are ready to show it popping in using an animation.
      newElement.setAttribute('visible', 'true')
      newElement.setAttribute('animation', {
        property: 'scale',
        to: `${randomScale} ${randomScale} ${randomScale}`,
        easing: 'easeOutElastic',
        dur: 800,
      })
      newElement.setAttribute('class', 'cantap almond')
      // newElement.setAttribute('xrextras-two-finger-rotate', '')
      // newElement.setAttribute('xrextras-pinch-scale', '')
    })
  },
}
