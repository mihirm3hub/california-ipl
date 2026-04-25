import { benefitMessages } from './lib/benefitMessages'

const rewardCycleStateStorageKey = 'almondRewardCycleState'

const matchRewardMessages = [
  {
    title: 'Bone Strength Unlocked',
    description: 'Almonds have Calcium that helps keep your bones strong for epic shots.',
  },
  {
    title: 'Muscle Strength Unlocked',
    description: 'Almonds have Protein that helps build and preserve muscles for epic shots.',
  },
  {
    title: 'Muscle Strength Unlocked',
    description: 'Almonds have Protein that helps build and preserve muscles for epic catches.',
  },
  {
    title: 'Sustained Energy Unlocked',
    description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
  },
  {
    title: 'Bone Strength Unlocked',
    description: 'Almonds have Calcium that helps keep your bones strong for epic shots.',
  },
  {
    title: 'Muscle Strength Unlocked',
    description: 'Almonds have Protein that helps build and preserve muscles for epic shots.',
  },
  {
    title: 'Heart Health Unlocked',
    description: 'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
  },
  {
    title: 'Calm Nerves Unlocked',
    description: 'Almonds have Magnesium that helps the body manage stressful moments like the last over.',
  },
  {
    title: 'Sustained Energy Unlocked',
    description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
  },
  {
    title: 'Calm Nerves Unlocked',
    description: 'Almonds have Magnesium that helps the body manage stressful moments like waiting for a DRS result.',
  },
  {
    title: 'Heart Health Unlocked',
    description: 'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
  },
  {
    title: 'Sustained Energy Unlocked',
    description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
  },
  {
    title: 'Heart Health Unlocked',
    description: 'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
  },
  {
    title: 'Sustained Energy Unlocked',
    description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
  },
]

const normalizeBenefitKey = (value) =>
  String(value || '')
    .replace(/\s+unlocked$/i, '')
    .trim()
    .toUpperCase()

const getRewardCycleState = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { matchRewardIndex: -1, idleRewardIndex: -1 }
  }

  try {
    const raw = window.localStorage.getItem(rewardCycleStateStorageKey)
    const parsed = JSON.parse(raw || '{}')

    return {
      matchRewardIndex: Number.isInteger(parsed?.matchRewardIndex)
        ? parsed.matchRewardIndex
        : -1,
      idleRewardIndex: Number.isInteger(parsed?.idleRewardIndex)
        ? parsed.idleRewardIndex
        : -1,
    }
  } catch (error) {
    return { matchRewardIndex: -1, idleRewardIndex: -1 }
  }
}

const saveRewardCycleState = (matchRewardIndex, idleRewardIndex) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  window.localStorage.setItem(
    rewardCycleStateStorageKey,
    JSON.stringify({ matchRewardIndex, idleRewardIndex }),
  )
}

const matchRewardTitleKeys = new Set(
  matchRewardMessages.map((message) => normalizeBenefitKey(message.title)),
)

const idleRewardMessages = benefitMessages.filter(
  (message) => !matchRewardTitleKeys.has(normalizeBenefitKey(message.title)),
)

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

  let matchRewardIndex = rewardCycleState.matchRewardIndex
  let idleRewardIndex = rewardCycleState.idleRewardIndex

  const getNextMessage = (points) => {
    const isMatchReward = Number(points) >= 50
    const rewardMessages = isMatchReward ? matchRewardMessages : idleRewardMessages

    if (!Array.isArray(rewardMessages) || rewardMessages.length === 0) {
      return null
    }

    if (isMatchReward) {
      matchRewardIndex = (matchRewardIndex + 1) % rewardMessages.length
      saveRewardCycleState(matchRewardIndex, idleRewardIndex)
      return rewardMessages[matchRewardIndex]
    }

    idleRewardIndex = (idleRewardIndex + 1) % rewardMessages.length
    saveRewardCycleState(matchRewardIndex, idleRewardIndex)
    return rewardMessages[idleRewardIndex]
  }

  window.updateRewardPopupContent = (points) => {
    const safePoints = Number(points) >= 50 ? 50 : 10
    const nextMessage = getNextMessage(points)

    if (popupPointsText) {
      popupPointsText.textContent = `${safePoints} POINTS`
    }

    if (popupTitle && nextMessage?.title) {
      popupTitle.textContent = nextMessage.title
    }

    if (popupDesc && nextMessage?.description) {
      popupDesc.textContent = nextMessage.description
    }
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
  initLookAroundToggle()
  initRewardPopupContent()
  initHamburgerMenu()
  initIdleStateRedirect()
})
