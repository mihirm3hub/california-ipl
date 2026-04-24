import { benefitMessages } from './lib/benefitMessages'

const unlockedBenefitsStorageKey = 'almondUnlockedBenefits'
const rewardCycleStateStorageKey = 'almondRewardCycleState'
const totalBenefitCount = 12
const benefitCardCountsByKey = {
  'WEIGHT MANAGEMENT': 1,
  'GLOWING SKIN': 1,
  'GUT HEALTH': 1,
  IMMUNITY: 1,
  'CALM NERVES': 1,
  'BLOOD SUGAR CONTROL': 1,
  'HEART HEALTH': 1,
  'HAIR HEALTH': 1,
  'MUSCLE STRENGTH': 1,
  'BONE STRENGTH': 1,
  'SUSTAINED ENERGY': 2,
}

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

const updateBenefitCount = () => {
  const benefitCountEl = document.getElementById('BenefitCount')
  if (!benefitCountEl) {
    return
  }

  benefitCountEl.textContent = `${getCollectedBenefitCount()}/${totalBenefitCount}`
}

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
    JSON.stringify({matchRewardIndex, idleRewardIndex}),
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

    if (nextMessage?.title) {
      saveUnlockedBenefitKey(nextMessage.title)
      updateBenefitCount()
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initLookAroundToggle()
  initRewardPopupContent()
  updateBenefitCount()
})
