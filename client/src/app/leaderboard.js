import { isGuestUser } from './appState.js'

export const LEADERBOARD_PAGE_SIZE = 10

export function buildLeaderboardProfiles(currentUser, publicProfileDirectory, isAuthenticated) {
  const seenIds = new Set()
  const allProfiles = [
    ...(isAuthenticated && currentUser && !isGuestUser(currentUser) ? [currentUser] : []),
    ...(publicProfileDirectory ?? []),
  ]

  return allProfiles
    .filter((profile) => {
      if (!profile?.id || seenIds.has(profile.id)) {
        return false
      }

      seenIds.add(profile.id)
      return true
    })
    .sort((left, right) => {
      const ratingDifference = (right.elo ?? 0) - (left.elo ?? 0)

      if (ratingDifference !== 0) {
        return ratingDifference
      }

      return (left.username ?? '').localeCompare(right.username ?? '')
    })
}

export function getLeaderboardPageCount(totalItems) {
  return Math.max(1, Math.ceil(totalItems / LEADERBOARD_PAGE_SIZE))
}

export function getVisibleLeaderboardPages(currentPage, pageCount) {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5]
  }

  if (currentPage >= pageCount - 2) {
    return Array.from({ length: 5 }, (_, index) => pageCount - 4 + index)
  }

  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ]
}
