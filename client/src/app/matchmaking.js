export function getClosestBotProfile(publicProfileDirectory, rating) {
  const botProfiles = publicProfileDirectory.filter((profile) => profile.isBot)

  if (botProfiles.length === 0) {
    return null
  }

  return [...botProfiles].sort((left, right) => {
    const leftDelta = Math.abs((left.elo ?? 1200) - rating)
    const rightDelta = Math.abs((right.elo ?? 1200) - rating)

    if (leftDelta !== rightDelta) {
      return leftDelta - rightDelta
    }

    return Math.random() < 0.5 ? -1 : 1
  })[0]
}
