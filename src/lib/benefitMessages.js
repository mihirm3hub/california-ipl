const benefitKeyAliases = {
  'BONE HEALTH': 'BONE STRENGTH',
  'MANAGE STRESS': 'CALM NERVES',
}

export const normalizeBenefitKey = (value) => {
  const normalizedKey = String(value || '')
    .replace(/\s+(unlocked|collected)$/i, '')
    .trim()
    .toUpperCase()

  return benefitKeyAliases[normalizedKey] || normalizedKey
}

export const matchRewardMessagesByEvent = {
  six: [
    {
      points: 50,
      title: 'Bone Health Collected',
      description:
        'Almonds have Calcium, Magnesium and Phosphorus that contribute to keeping bones strong for epic shots.',
    },
    {
      points: 50,
      title: 'Muscle Strength Collected',
      description:
        'Almonds have Protein, Vitamin E, and Good Fats that support muscle strength and recovery for epic shots.',
    },
  ],
  four: [
    {
      points: 50,
      title: 'Bone Health Collected',
      description:
        'Almonds have Calcium, Magnesium and Phosphorus that contribute to keeping bones strong for epic shots.',
    },
    {
      points: 50,
      title: 'Muscle Strength Collected',
      description:
        'Almonds have Protein, Vitamin E, and Good Fats that support muscle strength and recovery for epic shots.',
    },
  ],
  catch: [
    {
      points: 50,
      title: 'Muscle Strength Collected',
      description:
        'Almonds have Protein, Vitamin E, and Good Fats that support muscle strength and recovery for epic catches.',
    },
    {
      points: 50,
      title: 'Sustained Energy Collected',
      description:
        'The nutrient-dense structure of almonds slows digestion and supports longer-lasting energy for epic catches.',
    },
  ],
  two_or_three_runs: [
    {
      points: 50,
      title: 'Heart Health Collected',
      description:
        'Almonds contain Good Fats that help keep the heart healthy, perfect for those quick runs between the wickets!',
    },
  ],
  last_over: [
    {
      points: 50,
      title: 'Manage Stress Collected',
      description:
        'Almonds are a rich source of Magnesium that helps the body manage stress and supports better sleep, exactly what players need to stay calm in the last over!',
    },
    {
      points: 50,
      title: 'Sustained Energy Collected',
      description:
        'The nutrient-dense structure of almonds slows digestion and supports longer-lasting energy for long innings.',
    },
  ],
  drs: [
    {
      points: 50,
      title: 'Manage Stress Collected',
      description:
        'Almonds are a rich source of Magnesium that helps the body manage stress, exactly what players need to make the right call under DRS pressure!',
    },
  ],
  century: [
    {
      points: 50,
      title: 'Heart Health Collected',
      description:
        'Almonds contain Good Fats that help keep the heart healthy, perfect for the endurance and grit to keep batting, over after over!',
    },
    {
      points: 50,
      title: 'Sustained Energy Collected',
      description:
        'The nutrient-dense structure of almonds slows digestion and supports longer-lasting energy for long innings.',
    },
  ],
  half_century: [
    {
      points: 50,
      title: 'Heart Health Collected',
      description:
        'Almonds contain Good Fats that help keep the heart healthy, perfect for the endurance and grit to keep batting, over after over!',
    },
    {
      points: 50,
      title: 'Sustained Energy Collected',
      description:
        'The nutrient-dense structure of almonds slows digestion and supports longer-lasting energy for long innings.',
    },
  ],
}

export const idleRewardMessages = [
  {
    points: 10,
    title: 'Weight Management Collected',
    description: 'Almonds are rich in Good Fats, Fibre and Protein that help manage weight.',
  },
  {
    points: 10,
    title: 'Glowing Skin Collected',
    description: 'Almonds are rich in Vitamin E which helps nourish skin from within.',
  },
  {
    points: 10,
    title: 'Gut Health Collected',
    description: 'Almonds are rich in Fibre and act as a natural prebiotic that helps support gut health.',
  },
  {
    points: 10,
    title: 'Blood Sugar Control Collected',
    description: 'Almonds contain Protein, Fibre and Good Fats that help regulate blood sugar.',
  },
  {
    points: 10,
    title: 'Hair Health Collected',
    description: 'Almonds are rich in Vitamin E and contain Biotin that help keep hair healthy.',
  },
  {
    points: 10,
    title: 'Immunity Collected',
    description:
      'Almonds provide Zinc, Vitamin E, Magnesium, Iron, Copper, and Vitamin B9 that help support immune function.',
  },
]

const allBenefitMessages = [
  ...idleRewardMessages,
  ...Object.values(matchRewardMessagesByEvent).flat(),
]

export const benefitDetailsByKey = allBenefitMessages.reduce((acc, message) => {
  const key = normalizeBenefitKey(message.title)
  if (!key || acc[key]) {
    return acc
  }

  acc[key] = {
    key,
    title: message.title.replace(/\s+(Unlocked|Collected)$/i, ''),
    description: message.description,
  }
  return acc
}, {})

export const getBenefitDetailByKey = (benefitKey) =>
  benefitDetailsByKey[normalizeBenefitKey(benefitKey)] || null
