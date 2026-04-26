export const normalizeBenefitKey = (value) =>
  String(value || '')
    .replace(/\s+unlocked$/i, '')
    .trim()
    .toUpperCase()

export const matchRewardMessagesByEvent = {
  six: [
    {
      points: 50,
      title: 'Bone Strength Unlocked',
      description: 'Almonds have Calcium that helps keep your bones strong for epic shots.',
    },
    {
      points: 50,
      title: 'Muscle Strength Unlocked',
      description: 'Almonds have Protein that helps build and preserve muscles for epic shots.',
    },
  ],
  four: [
    {
      points: 50,
      title: 'Bone Strength Unlocked',
      description: 'Almonds have Calcium that helps keep your bones strong for epic shots.',
    },
    {
      points: 50,
      title: 'Muscle Strength Unlocked',
      description: 'Almonds have Protein that helps build and preserve muscles for epic shots.',
    },
  ],
  catch: [
    {
      points: 50,
      title: 'Muscle Strength Unlocked',
      description: 'Almonds have Protein that helps build and preserve muscles for epic catches.',
    },
    {
      points: 50,
      title: 'Sustained Energy Unlocked',
      description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
    },
  ],
  two_or_three_runs: [
    {
      points: 50,
      title: 'Heart Health Unlocked',
      description:
        'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
    },
  ],
  last_over: [
    {
      points: 50,
      title: 'Calm Nerves Unlocked',
      description:
        'Almonds have Magnesium that helps the body manage stressful moments like the last over.',
    },
    {
      points: 50,
      title: 'Sustained Energy Unlocked',
      description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
    },
  ],
  drs: [
    {
      points: 50,
      title: 'Calm Nerves Unlocked',
      description:
        'Almonds have Magnesium that helps the body manage stressful moments like waiting for a DRS result.',
    },
  ],
  century: [
    {
      points: 50,
      title: 'Heart Health Unlocked',
      description:
        'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
    },
    {
      points: 50,
      title: 'Sustained Energy Unlocked',
      description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
    },
  ],
  half_century: [
    {
      points: 50,
      title: 'Heart Health Unlocked',
      description:
        'Almonds have Good Fats that help keep the heart healthy to keep running between the wickets.',
    },
    {
      points: 50,
      title: 'Sustained Energy Unlocked',
      description: 'Almonds have Magnesium and B vitamins that help in sustaining energy for long innings.',
    },
  ],
}

export const idleRewardMessages = [
  {
    points: 10,
    title: 'Weight Management Unlocked',
    description: 'Almonds have Protein, Fibre and Good Fats that help in managing weight.',
  },
  {
    points: 10,
    title: 'Glowing Skin Unlocked',
    description: 'Almonds have Vitamin E that helps your skin glow.',
  },
  {
    points: 10,
    title: 'Gut Health Unlocked',
    description: 'Almonds have Fibre that helps keep your gut healthy.',
  },
  {
    points: 10,
    title: 'Blood Sugar Control Unlocked',
    description: 'Almonds have Protein, Fiber and Good fats that help keep your sugar in check.',
  },
  {
    points: 10,
    title: 'Hair Health Unlocked',
    description: 'Almonds have Vitamin E that helps keep your hair healthy.',
  },
  {
    points: 10,
    title: 'Immunity Unlocked',
    description: 'Almonds have Zinc, Protein and Vitamin B9 that help boost your immunity.',
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
    title: message.title.replace(/\s+Unlocked$/i, ''),
    description: message.description,
  }
  return acc
}, {})

export const getBenefitDetailByKey = (benefitKey) =>
  benefitDetailsByKey[normalizeBenefitKey(benefitKey)] || null
