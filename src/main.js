import { resolveApiBaseUrl } from './lib/cricketApi'
import {
  idleRewardMessages,
  matchRewardMessagesByEvent,
  normalizeBenefitKey,
} from './lib/benefitMessages.js'

const unlockedBenefitsStorageKey = 'almondUnlockedBenefits'
const rewardCycleStateStorageKey = 'almondRewardCycleState'
const totalBenefitCount = 12
const benefitCardCountsByKey = {
  'WEIGHT MANAGEMENT': 1,
  'GLOWING SKIN': 1,
  'GUT HEALTH': 1,
  'IMMUNITY': 1,
  'CALM NERVES': 1,
  'BLOOD SUGAR CONTROL': 1,
  'HEART HEALTH': 1,
  'HAIR HEALTH': 1,
  'MUSCLE STRENGTH': 1,
  'BONE STRENGTH': 1,
  'SUSTAINED ENERGY': 2,
}
const userDataApiEndpoint = `${resolveApiBaseUrl()}/api/user/userData`

let weeklyPoints = 0
let overallPoints = 0
let unlockedBenefitsCount = 0

const renderUserDataStats = (userData = {}) => {
  const weeklyScoreEl = document.getElementById('WeeklyScoreText')
  const benefitCountEl = document.getElementById('BenefitCount')
  const safeWeeklyPoints = Math.max(0, Number(userData.weeklyPoints) || 0)
  const safeBenefitCount = Math.min(
    totalBenefitCount,
    Math.max(
      0,
      Array.isArray(userData.almondBenefitsUnlocked)
        ? userData.almondBenefitsUnlocked.length
        : 0,
    ),
  )

  if (weeklyScoreEl) {
    weeklyScoreEl.textContent = String(safeWeeklyPoints)
  }

  if (benefitCountEl) {
    benefitCountEl.textContent = `${safeBenefitCount}/${totalBenefitCount}`
  }
}

const renderWeeklyPoints = () => {
  const weeklyScoreEl = document.getElementById('WeeklyScoreText')
  if (!weeklyScoreEl) {
    return
  }

  weeklyScoreEl.textContent = String(Math.max(0, Number(weeklyPoints) || 0))
}

const getUnlockedBenefitKeys = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(unlockedBenefitsStorageKey)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const saveUnlockedBenefitKey = (title) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  const benefitKey = normalizeBenefitKey(title)
  if (!benefitKey) {
    return
  }

  const unlockedBenefitKeys = new Set(getUnlockedBenefitKeys())
  unlockedBenefitKeys.add(benefitKey)
  window.localStorage.setItem(
    unlockedBenefitsStorageKey,
    JSON.stringify([...unlockedBenefitKeys]),
  )
}

const getCollectedBenefitCount = () =>
  getUnlockedBenefitKeys().reduce((total, benefitKey) => {
    const normalizedKey = normalizeBenefitKey(benefitKey)
    return total + (benefitCardCountsByKey[normalizedKey] || 0)
  }, 0)

const renderBenefitCount = () => {
  const benefitCountEl = document.getElementById('BenefitCount')
  if (!benefitCountEl) {
    return
  }

  const localBenefitCount = getCollectedBenefitCount()
  const safeBenefitCount = Math.min(
    totalBenefitCount,
    Math.max(0, Number(unlockedBenefitsCount) || 0, localBenefitCount),
  )

  benefitCountEl.textContent = `${safeBenefitCount}/${totalBenefitCount}`
}

const fetchUserData = async () => {
  const authToken = sessionStorage.getItem('authToken') || ''

  if (!authToken) {
    console.warn('authToken is missing in sessionStorage')
    renderWeeklyPoints()
    return null
  }

  try {
    const response = await window.fetch(userDataApiEndpoint, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch userData: ${response.status}`)
    }

    const payload = await response.json()
    const userData = payload?.data || {}
    console.log('[userData] fetched:', userData)

    weeklyPoints = Number(userData.weeklyPoints) || 0
    overallPoints = Number(userData.overallPoints) || 0
    unlockedBenefitsCount = Array.isArray(userData.almondBenefitsUnlocked)
      ? userData.almondBenefitsUnlocked.length
      : 0

    renderUserDataStats(userData)
    renderWeeklyPoints()
    renderBenefitCount()

    return userData
  } catch (error) {
    console.error('Error fetching userData', error)
    renderWeeklyPoints()
    renderBenefitCount()
    return null
  }
}

const matchRewardEventAliases = {
  wicket: 'catch',
  out: 'catch',
  two_runs: 'two_or_three_runs',
  three_runs: 'two_or_three_runs',
}

const shuffleArray = (items) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const getRewardCycleState = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { matchRewardIndexes: {}, matchRewardQueues: {}, idleRewardIndex: -1 }
  }

  try {
    const raw = window.localStorage.getItem(rewardCycleStateStorageKey)
    const parsed = JSON.parse(raw || '{}')

    return {
      matchRewardIndexes:
        parsed?.matchRewardIndexes && typeof parsed.matchRewardIndexes === 'object'
          ? parsed.matchRewardIndexes
          : {},
      matchRewardQueues:
        parsed?.matchRewardQueues && typeof parsed.matchRewardQueues === 'object'
          ? parsed.matchRewardQueues
          : {},
      idleRewardIndex: Number.isInteger(parsed?.idleRewardIndex)
        ? parsed.idleRewardIndex
        : -1,
    }
  } catch (error) {
    return { matchRewardIndexes: {}, matchRewardQueues: {}, idleRewardIndex: -1 }
  }
}

const saveRewardCycleState = (matchRewardIndexes, matchRewardQueues, idleRewardIndex) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  window.localStorage.setItem(
    rewardCycleStateStorageKey,
    JSON.stringify({ matchRewardIndexes, matchRewardQueues, idleRewardIndex }),
  )
}

const initLookAroundToggle = () => {
  const lookText = document.querySelector('.look-text')
  const arrowZones = document.querySelectorAll('.arrow-zone')
  const pointingIcon = document.querySelector('.pointing-icon')

  if (!lookText || arrowZones.length === 0) return

  const setLookAroundState = (showLookAround) => {
    lookText.classList.toggle('show-lookaround', showLookAround)
    if (pointingIcon) {
      pointingIcon.src = showLookAround
        ? './assets/images/camera.png'
        : './assets/images/pointing.png'
    }
  }

  const toggleHint = () => {
    const isShowingLookAround = lookText.classList.contains('show-lookaround')
    setLookAroundState(!isShowingLookAround)
  }

  const onKeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleHint()
    }
  }

  arrowZones.forEach((zone) => {
    zone.addEventListener('click', toggleHint)
    zone.addEventListener('keydown', onKeydown)
  })

  // Start with the default single-line instruction visible.
  setLookAroundState(false)
}

const initRewardPopupContent = () => {
  const popupPointsText = document.getElementById('rewardPointsText')
  const popupTitle = document.getElementById('rewardTitle')
  const popupDesc = document.getElementById('rewardDesc')
  const rewardCycleState = getRewardCycleState()

  let matchRewardIndexes = rewardCycleState.matchRewardIndexes || {}
  let matchRewardQueues = rewardCycleState.matchRewardQueues || {}
  let idleRewardIndex = rewardCycleState.idleRewardIndex

  const resolveMatchRewardEventKey = (eventKey) => {
    const normalizedKey = String(eventKey || '').trim().toLowerCase()
    return matchRewardEventAliases[normalizedKey] || normalizedKey
  }

  const getNextMessage = (points, rewardEventKey) => {
    const isMatchReward = Number(points) >= 50
    const normalizedEventKey = resolveMatchRewardEventKey(rewardEventKey)
    const rewardMessages = isMatchReward
      ? matchRewardMessagesByEvent[normalizedEventKey] || []
      : idleRewardMessages

    if (!Array.isArray(rewardMessages) || rewardMessages.length === 0) {
      return null
    }

    if (isMatchReward) {
      let queue = Array.isArray(matchRewardQueues[normalizedEventKey])
        ? matchRewardQueues[normalizedEventKey]
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 0 && value < rewardMessages.length)
        : []

      if (queue.length === 0) {
        const allIndexes = rewardMessages.map((_, index) => index)
        queue = shuffleArray(allIndexes)

        const previousIndex = Number(matchRewardIndexes[normalizedEventKey])
        if (
          queue.length > 1 &&
          Number.isInteger(previousIndex) &&
          queue[0] === previousIndex
        ) {
          ;[queue[0], queue[1]] = [queue[1], queue[0]]
        }
      }

      const nextMatchRewardIndex = queue[0]
      const remainingQueue = queue.slice(1)
      matchRewardIndexes = {
        ...matchRewardIndexes,
        [normalizedEventKey]: nextMatchRewardIndex,
      }
      matchRewardQueues = {
        ...matchRewardQueues,
        [normalizedEventKey]: remainingQueue,
      }
      saveRewardCycleState(matchRewardIndexes, matchRewardQueues, idleRewardIndex)
      return rewardMessages[nextMatchRewardIndex]
    }

    idleRewardIndex = (idleRewardIndex + 1) % rewardMessages.length
    saveRewardCycleState(matchRewardIndexes, matchRewardQueues, idleRewardIndex)
    return rewardMessages[idleRewardIndex]
  }

  window.updateRewardPopupContent = (points, rewardEventKey = null) => {
    const safePoints = Number(points) >= 50 ? 50 : 10
    const nextMessage = getNextMessage(points, rewardEventKey)
    const resolvedPoints = Number(nextMessage?.points) > 0 ? Number(nextMessage.points) : safePoints

    weeklyPoints += resolvedPoints
    renderWeeklyPoints()

    if (popupPointsText) {
      popupPointsText.textContent = `${resolvedPoints} POINTS`
    }

    if (popupTitle && nextMessage?.title) {
      popupTitle.textContent = nextMessage.title
    }

    if (popupDesc && nextMessage?.description) {
      popupDesc.textContent = nextMessage.description
    }

    if (nextMessage?.title) {
      saveUnlockedBenefitKey(nextMessage.title)
      renderBenefitCount()
    }

    const unlockedBenefit = nextMessage?.title
      ? {
          id: nextMessage.title,
          benefit: nextMessage.description || '',
          pts: resolvedPoints,
        }
      : null

    window.almondLastUnlockedBenefit = unlockedBenefit
    return unlockedBenefit
  }
}

const initMatchEventPopup = () => {
  const overlay = document.getElementById('gameOverlay')
  const popup = document.getElementById('sixPopup')
  const leadText = document.getElementById('matchEventLead')
  const valueText = document.getElementById('matchEventValue')

  if (!overlay || !popup || !leadText || !valueText) {
    return
  }

  let hideTimerId = null
  const popupCopyByEvent = {
    six: { lead: "IT'S A", value: 'SIX!' },
    catch: { lead: "NOW THAT'S A", value: 'CATCH!' },
    wicket: { lead: "NOW THAT'S A", value: 'CATCH!' },
    four: { lead: "IT'S A", value: 'FOUR!' },
    two_or_three_runs: { lead: 'QUICK', value: 'RUNNING!' },
    last_over: { lead: "IT'S THE", value: 'LAST OVER!' },
    drs: { lead: "IT'S", value: 'DRS TIME!' },
    century: { lead: "IT'S A", value: 'CENTURY!' },
    half_century: { lead: "IT'S A", value: 'HALF-CENTURY!' },
  }

  window.showMatchEventPopup = (eventKind) => {
    const copy = popupCopyByEvent[eventKind]
    if (!copy) {
      return
    }

    leadText.textContent = copy.lead
    valueText.textContent = copy.value
    popup.classList.toggle(
      'long-copy',
      copy.lead.length > 10 || copy.value.length > 10,
    )
    overlay.classList.add('active')

    if (hideTimerId) {
      window.clearTimeout(hideTimerId)
    }

    hideTimerId = window.setTimeout(() => {
      overlay.classList.remove('active')
      popup.classList.remove('long-copy')
      hideTimerId = null
    }, 3000)
  }
}

const initHamburgerMenu = () => {
  const hamburger = document.getElementById('hamburger')
  const mobileMenu = document.getElementById('mobileMenu')

  if (!hamburger || !mobileMenu) {
    return
  }

  if (hamburger.dataset.menuBound === '1') {
    return
  }

  hamburger.dataset.menuBound = '1'

  const openMenu = () => {
    hamburger.classList.add('active')
    mobileMenu.classList.add('active')
    document.body.classList.add('menu-open')
  }

  const closeMenu = () => {
    hamburger.classList.remove('active')
    mobileMenu.classList.remove('active')
    document.body.classList.remove('menu-open')
  }

  hamburger.addEventListener('click', (event) => {
    event.stopPropagation()
    if (mobileMenu.classList.contains('active')) {
      closeMenu()
    } else {
      openMenu()
    }
  })

  const menuClose = document.getElementById('menuClose')
  if (menuClose) {
    menuClose.addEventListener('click', closeMenu)
  }

  const menuLinks = mobileMenu.querySelectorAll('a')
  menuLinks.forEach((link) => {
    link.addEventListener('click', closeMenu)
  })

  document.addEventListener('click', (event) => {
    if (
      mobileMenu.classList.contains('active') &&
      !mobileMenu.contains(event.target) &&
      !hamburger.contains(event.target)
    ) {
      closeMenu()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu()
    }
  })
}

window.initHamburgerMenu = initHamburgerMenu

const initIdleStateRedirect = () => {
  let idleTimerId = null
  const idleTimeoutMs = 5 * 60 * 1000
  let resolvedMissingOutPath = null

  const resolveMissingOutPath = async () => {
    if (resolvedMissingOutPath) {
      return resolvedMissingOutPath
    }

    const candidatePaths = [
      'missing-out.html',
      '/missing-out.html',
      'dist/missing-out.html',
      '/dist/missing-out.html',
      'src/missing-out.html',
      '/src/missing-out.html',
    ]

    for (const path of candidatePaths) {
      try {
        const response = await window.fetch(path, { method: 'GET', cache: 'no-store' })
        if (response.ok) {
          resolvedMissingOutPath = path
          return resolvedMissingOutPath
        }
      } catch (error) {
        // Try next candidate.
      }
    }

    resolvedMissingOutPath = 'missing-out.html'
    return resolvedMissingOutPath
  }

  const goToMissingOut = async () => {
    const targetPath = await resolveMissingOutPath()
    console.log(`Redirecting to ${targetPath} due to inactivity`)
    window.location.href = targetPath
  }

  const resetIdleTimer = () => {
    if (idleTimerId) {
      window.clearTimeout(idleTimerId)
    }
    idleTimerId = window.setTimeout(goToMissingOut, idleTimeoutMs)
  }

  ;['click', 'keydown', 'mousemove', 'pointerdown', 'scroll', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, resetIdleTimer, { passive: true })
  })

  resetIdleTimer()
}

window.addEventListener('DOMContentLoaded', () => {
  renderWeeklyPoints()
  renderBenefitCount()
  initLookAroundToggle()
  initRewardPopupContent()
  initMatchEventPopup()
  initHamburgerMenu()
  initIdleStateRedirect()
  fetchUserData()
})
