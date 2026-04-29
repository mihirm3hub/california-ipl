// Component that spawns almond entities around the user

import {
  getBallByBall,
  getFeaturedMatchSelection,
  getMatch,
  getMatchStatusString,
  isCompletedMatchStatus,
  resolveApiBaseUrl,
} from './lib/cricketApi'
import {
  ballSignature,
  extractLatestBall,
  getBallEventKind,
  getRunsFromBall,
  stripBallCommentHtml,
} from './lib/ballEvents'

export const entitySpawnerComponent = {
  schema: {
    min: { default: 10 },
    max: { default: 14 },
  },
  init() {
    this.prompt = document.getElementById('promptText')
    this.scoreEl = document.getElementById('scoreText')
    this.liveStatusEl = document.querySelector('.live-status')
    this.liveStatusTextEl = this.liveStatusEl?.querySelector('p') || null
    this.camera = document.getElementById('camera')
    this.popup = document.getElementById('almondPopup')
    this.popupOkBtn = document.getElementById('popupOkBtn')
    this.popupCloseBtn = document.getElementById('rewardClose')
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
    this.hasShownGameEndScreen = false
    this.isLiveMatchConnected = false
    this.score = 0
    this.lastAwardedPoints = 0
    this.nextSpawnMeta = null
    this.idleSpawnCount = 0
    this.idleSpawnStartedAt = Date.now()

    this.hidePopup = this.hidePopup.bind(this)

    if (this.popupOkBtn) {
      this.popupOkBtn.addEventListener('click', this.hidePopup)
    }
    if (this.popupCloseBtn) {
      this.popupCloseBtn.addEventListener('click', this.hidePopup)
    }

    if (this.prompt) {
      this.prompt.textContent = 'Waiting for match events…'
    }
    this.renderScore()
    this.renderLiveMatchStatus()

    this.spawnIntervalId = null

    // (1) Almond appears every 30s and disappears in 10s (10 points).
    this.idleSpawnIntervalId = window.setInterval(() => {
      if (!this.canSpawnAlmonds()) {
        console.log('[almond] idle spawn skipped: live match is not connected')
        return
      }

      this.idleSpawnCount += 1
      console.log('[almond] 30s idle spawn tick:', {
        count: this.idleSpawnCount,
        elapsedSeconds: Math.round((Date.now() - this.idleSpawnStartedAt) / 1000),
      })
      this.spawnIdleAlmond()
    }, 10000)

    console.log('[bb] init: starting featured match streaming')
    this.startBallByBallStreaming()
    this.registerConsoleSpawnKnob()
  },
  registerConsoleSpawnKnob() {
    if (typeof window === 'undefined') return

    // Rebind the knob to the latest component instance.
    if (typeof window.__cleanupAlmondSpawnKnob === 'function') {
      window.__cleanupAlmondSpawnKnob()
    }

    let current = 'idle'
    const spawnFromConsole = (value) => {
      const normalized = String(value || '').trim().toLowerCase()
      if (normalized !== 'idle' && normalized !== 'match') {
        console.warn("[almond] use 'idle' or 'match'")
        return
      }

      if (!this.canSpawnAlmonds()) {
        console.warn('[almond] spawn blocked: live match is not connected')
        return
      }

      const meta =
        normalized === 'match'
          ? { type: 'match', points: 50, despawnMs: 30000 }
          : { type: 'idle', points: 10, despawnMs: 10000 }
      const almondEl = this.spawnAlmondAroundUser(meta.type)
      this.tagSpawnedAlmond(almondEl, meta)
      console.log('[almond] console spawn:', normalized)
    }

    window.spawnAlmondType = (value) => {
      spawnFromConsole(value)
    }

    Object.defineProperty(window, 'almondSpawnType', {
      configurable: true,
      enumerable: false,
      get() {
        return current
      },
      set: (value) => {
        current = String(value || '').trim().toLowerCase()
        spawnFromConsole(current)
      },
    })

    window.__cleanupAlmondSpawnKnob = () => {
      delete window.spawnAlmondType
      delete window.almondSpawnType
      delete window.__cleanupAlmondSpawnKnob
    }

    console.log("[almond] test knob ready: set window.almondSpawnType = 'idle' | 'match'")
    console.log("[almond] helper ready: window.spawnAlmondType('idle' | 'match')")
  },
  renderScore() {
    console.log('[score] rendering score:', this.score)
    if (!this.scoreEl) return
    console.log('[score] scoreEl:', this.scoreEl)
    console.log('[score] score:', this.score)
    const awardText = this.lastAwardedPoints > 0 ? ` (+${this.lastAwardedPoints})` : ''
    this.scoreEl.textContent = `Score: ${this.score}`
    console.log('[score] scoreEl.textContent:', this.scoreEl.textContent)
  },
  canSpawnAlmonds() {
    return Boolean(this.isLiveMatchConnected && this.el?.sceneEl)
  },
  clearSpawnedAlmonds() {
    if (!this.el?.sceneEl) return

    const spawnedAlmonds = this.el.sceneEl.querySelectorAll('[data-spawn-type]')
    spawnedAlmonds.forEach((almondEl) => {
      if (almondEl.__despawnTimer) {
        window.clearTimeout(almondEl.__despawnTimer)
        almondEl.__despawnTimer = null
      }

      const parentEl = almondEl.parentNode
      if (parentEl?.parentNode) {
        parentEl.parentNode.removeChild(parentEl)
        return
      }

      if (almondEl.parentNode) {
        almondEl.parentNode.removeChild(almondEl)
      }
    })
  },
  setLiveMatchConnected(isConnected) {
    const nextConnectedState = Boolean(isConnected)
    const didDisconnect = this.isLiveMatchConnected && !nextConnectedState

    this.isLiveMatchConnected = nextConnectedState
    if (didDisconnect) {
      this.clearSpawnedAlmonds()
    }
    this.renderLiveMatchStatus()
  },
  renderLiveMatchStatus() {
    if (!this.liveStatusEl || !this.liveStatusTextEl) return

    this.liveStatusEl.classList.toggle('is-connected', this.isLiveMatchConnected)
    this.liveStatusTextEl.textContent = this.isLiveMatchConnected
      ? 'Connected to Live Match'
      : 'Not Connected to Live Match'
  },
  tagSpawnedAlmond(el, meta) {
    if (!meta || !el) return
    try {
      el.dataset.spawnType = meta.type
      el.dataset.points = String(meta.points)
      el.dataset.despawnMs = String(meta.despawnMs)
      if (meta.eventKey) {
        el.dataset.eventKey = String(meta.eventKey)
      }
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
    if (!this.canSpawnAlmonds()) return
    const meta = { type: 'idle', points: 10, despawnMs: 10000 }
    const almondEl = this.spawnAlmondAroundUser(meta.type)
    this.tagSpawnedAlmond(almondEl, meta)
  },
  spawnMatchEventAlmond(eventKey = '') {
    if (!this.canSpawnAlmonds()) return
    const meta = { type: 'match', points: 50, despawnMs: 30000, eventKey }
    const almondEl = this.spawnAlmondAroundUser(meta.type)
    this.tagSpawnedAlmond(almondEl, meta)
  },
  async startBallByBallStreaming(pollMs = 10000) {
    this.stopBallByBallStreaming()
    this.bbError = ''
    this.bbNotStarted = false
    this.setLiveMatchConnected(false)

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
      this.hasShownGameEndScreen = false
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
        this.setLiveMatchConnected(false)
        this.renderBallByBallStatus()

        // No ball-by-ball polling if the match is not started.
        // Instead, periodically re-check featured match status.
        this.bbStatusIntervalId = window.setInterval(async () => {
          try {
            console.log('[bb] status tick: re-checking featured match…')
            const nextSel = await getFeaturedMatchSelection({ "tournamentKey": "a-rz--cricket--bcci--iplt20--2026-ZGwl", now: new Date() })
            const nextStatus = String(nextSel?.status || '').toLowerCase()
            console.log('[bb] status tick:', nextStatus)
            if (isCompletedMatchStatus(nextStatus)) {
              this.handleGameEndRedirect({
                matchKey: nextSel?.matchKey || matchKey,
                status: nextStatus,
                source: 'status-poll',
              })
            } else if (nextStatus !== 'not_started') {
              console.log('[bb] match started (status changed); starting ball-by-ball')
              this.startBallByBallStreaming(pollMs)
            } else {
              this.setLiveMatchConnected(false)
            }
          } catch (e) {
            this.setLiveMatchConnected(false)
            console.warn('[bb] status tick failed:', e)
          }
        }, pollMs)
        return
      } else {
        if (this.prompt) this.prompt.textContent = `Match: ${this.bbMatchLabel} (loading…)`
        console.log('[bb] fetching ball-by-ball (initial)…')
        const json = await getBallByBall(matchKey)
        this.bbJson = json
        this.setLiveMatchConnected(true)
        console.log('[bb] ball-by-ball loaded (initial)')
        this.renderBallByBallStatus()
      }
    } catch (e) {
      this.bbError = e?.message || 'Failed to load ball-by-ball'
      this.setLiveMatchConnected(false)
      console.error('[bb] failed to start streaming:', e)
      this.renderBallByBallStatus()
      return
    }

    console.log('[bb] polling started, every', pollMs, 'ms')
    this.bbIntervalId = window.setInterval(async () => {
      try {
        console.log('[bb] polling tick: fetching ball-by-ball…')
        const matchDetails = await getMatch(this.bbMatchKey)
        const matchStatus = getMatchStatusString(matchDetails)
        if (isCompletedMatchStatus(matchStatus)) {
          this.handleGameEndRedirect({
            matchKey: this.bbMatchKey,
            status: matchStatus,
            source: 'match-poll',
          })
          return
        }

        const json = await getBallByBall(this.bbMatchKey)
        this.bbJson = json
        this.bbError = ''
        this.setLiveMatchConnected(true)
        console.log('[bb] polling tick: success')
        this.renderBallByBallStatus()
      } catch (e) {
        this.bbError = e?.message || 'Failed to refresh ball-by-ball'
        this.setLiveMatchConnected(false)
        console.warn('[bb] polling tick: failed:', e)
        this.renderBallByBallStatus()
      }
    }, pollMs)
  },
  handleGameEndRedirect({ matchKey = '', status = '', source = '' } = {}) {
    if (this.hasShownGameEndScreen) {
      return
    }

    this.hasShownGameEndScreen = true
    this.stopBallByBallStreaming()
    console.log('[game-end] active match completed', { matchKey, status, source })

    if (typeof window !== 'undefined' && typeof window.showGameEndScreen === 'function') {
      window.showGameEndScreen({
        pointsEarned: this.score,
      })
    }
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
    this.setLiveMatchConnected(false)
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
      const eventKey =
        kind === 'six'
          ? 'six'
          : kind === 'four'
            ? 'four'
            : kind === 'wicket'
              ? 'catch'
              : runsNum === 2 || runsNum === 3
                ? 'two_or_three_runs'
                : ''
      const shouldSpawn = Boolean(eventKey)
      if (shouldSpawn) {
        console.log('[bb] spawn trigger:', { kind, runs: runsNum })
        if (
          typeof window !== 'undefined' &&
          typeof window.showMatchEventPopup === 'function'
        ) {
          window.showMatchEventPopup(eventKey === 'catch' ? 'wicket' : eventKey)
        }
        // (2) Almond appears as per IPL API logic and disappears after 20s (50 points).
        this.spawnMatchEventAlmond(eventKey)
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
    if (this.popupCloseBtn) {
      this.popupCloseBtn.removeEventListener('click', this.hidePopup)
    }

    if (typeof window !== 'undefined' && typeof window.__cleanupAlmondSpawnKnob === 'function') {
      window.__cleanupAlmondSpawnKnob()
    }

  },
  showPopup() {
    if (!this.popup) {
      return
    }

    this.popup.classList.remove('hidden')
    this.popup.classList.add('active')
  },
  setRewardPopupContent(points) {
    let unlockedBenefit = null
    if (typeof window !== 'undefined' && typeof window.updateRewardPopupContent === 'function') {
      unlockedBenefit = window.updateRewardPopupContent(
        points,
        this.selectedAlmond?.dataset?.eventKey || null,
      )
    }

    this.popup.classList.remove('hidden')
    return unlockedBenefit
  },
  resolveSelectedAlmondPoints() {
    if (!this.selectedAlmond || !this.selectedAlmond.dataset) {
      return 0
    }

    const explicitPoints = Number(this.selectedAlmond.dataset.points)
    if (Number.isFinite(explicitPoints) && explicitPoints > 0) {
      return explicitPoints
    }

    // Fallback mapping if a future spawn path only tags spawnType.
    const spawnType = this.selectedAlmond.dataset.spawnType
    if (spawnType === 'match') {
      return 50
    }
    if (spawnType === 'idle') {
      return 10
    }

    return 0
  },
  hidePopup() {
    if (!this.popup) {
      return
    }

    this.popup.classList.add('hidden')
    this.popup.classList.remove('active')

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
    console.log('scored')
    // Award points immediately on tap (prevents "score not updating" if user doesn't hit OK).
    try {
      const pts = this.resolveSelectedAlmondPoints()
      if (this.selectedAlmond && this.selectedAlmond.dataset) {
        if (this.selectedAlmond.dataset.claimed !== '1') {
          if (Number.isFinite(pts) && pts > 0) {
            this.selectedAlmond.dataset.claimed = '1'
            this.score += pts
            this.lastAwardedPoints = pts
            console.log('[score] +', pts, '=>', this.score)
            this.renderScore()
            const unlockedBenefit = this.setRewardPopupContent(pts)
          // Submit score to backend API
          // Assumes you have access to a JWT token in this.jwtToken, or replace as needed.
          this.jwtToken = sessionStorage.getItem('authToken') || ''
          if (!this.jwtToken) {
            console.warn("[api] JWT token not found; skipping score submission.");
          }
          const apiUrl = `${resolveApiBaseUrl()}/api/gameplay/progress/submit`;
          const payload = {
            pointsEarned: pts,
            ...(unlockedBenefit ? { benefit: unlockedBenefit } : {}),
          };
          console.log('[api] submitting:', payload)
          if (this.jwtToken) {
            fetch(apiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.jwtToken}`
              },
              body: JSON.stringify(payload)
            })
            .then(response => {
              if (!response.ok) {
                throw new Error("API submission failed");
              }
              return response.json();
            })
            .then(data => {
              console.log("[api] Score submitted:", data);
            })
            .catch(err => {
              console.warn("[api] Score submission error:", err);
            });
          } else {
            console.warn("[api] JWT token not found; skipping score submission.");
          }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    this.renderBallByBallStatus()
    this.showPopup()
  },
  spawnAlmondAroundUser(spawnType = 'idle') {
    if (!this.camera) {
      return null
    }

    const cameraPosition = this.camera.object3D.position
    const minRadius = 20
    const maxRadius = 80
    const randomAngle = Math.random() * Math.PI * 2
    const randomDistance = minRadius + Math.random() * (maxRadius - minRadius)
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


    console.log('[almond] spawn type:', spawnType)
    const glowTextureId = spawnType === 'match' ? 'glowTexYellow' : 'glowTex'

    newElement.insertAdjacentHTML('beforeend', `
        <a-entity
          id="sparkleImage"
          material="src: #${glowTextureId}; color: 0.1 0.1 0.1; side: double; depthTest: true; transparent: true;"
          geometry="primitive: circle; height: 1.024 width: 1.024;"
          render-order="foreground"
          scale="1.5 1.5 1.5"
          position="0 0.5 -1.3"
          rotation="0 0 0">
        </a-entity>
      `)
    // if (spawnType === 'match') {
    //   newElement.insertAdjacentHTML('beforeend', `
    //       <a-entity
    //         id="sparkleVideo"
    //         play-video="video: #sparkle-video; autoplay: true"
    //         material="shader: chromakey; src: #sparkle-video; color: 0.1 0.1 0.1; side: double; depthTest: true; transparent: true;alphaTest: 0.5;"
    //         geometry="primitive: plane; height: 1.024 width: 1.024;"
    //         render-order="background"
    //         scale="1.5 1.5 1.5"
    //         position="0 0.5 -1.26"
    //         rotation="0 0 0">
    //       </a-entity>
    //     `)
    // } else if (spawnType === 'idle') {
    //   const sparkleVideoEl = newElement.querySelector('#sparkleVideo')
    //   if (sparkleVideoEl && sparkleVideoEl.parentNode) {
    //     sparkleVideoEl.parentNode.removeChild(sparkleVideoEl)
    //   }
    // }
    // parentElement.insertAdjacentHTML('beforeend', `
    //     <a-entity
    //       id="alphaVideo"
    //       play-video="video: #alpha-video; autoplay: true"
    //       material="shader: chromakey; src: #alpha-video; color: 0.1 0.1 0.1; side: double; depthTest: true;"
    //       geometry="primitive: plane; height: 1.024 width: 1.024;"
    //       scale="4 4 4"
    //       position="0 .4 0"
    //       rotation="90 0 0">
    //     </a-entity>
    //   `)

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

    return newElement
  },
}
