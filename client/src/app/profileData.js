function formatMemberSince(createdAt) {
  if (!createdAt) {
    return '-'
  }

  return new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function buildProfileFromBackendUser(user) {
  if (!user) {
    return null
  }

  return {
    id: String(user.id),
    username: user.username,
    elo: user.elo,
    isBot: user.is_bot === true,
    memberSince: formatMemberSince(user.created_at),
    createdAt: user.created_at,
  }
}

export function buildHistoryEntryFromBackendMatch(match, userId) {
  const normalizedUserId = String(userId)
  const isBottom = String(match.bottom_player_id) === normalizedUserId
  const playerSide = isBottom ? 'bottom' : 'top'
  const opponentSide = isBottom ? 'top' : 'bottom'
  const playerRating = isBottom ? match.bottom_rating_before : match.top_rating_before
  const opponentRating = isBottom ? match.top_rating_before : match.bottom_rating_before
  const ratingDelta = isBottom ? match.bottom_rating_change : match.top_rating_change
  const opponentRatingDelta = isBottom ? match.top_rating_change : match.bottom_rating_change
  const opponentName = isBottom
    ? match.top_player_username ?? `Player ${match.top_player_id}`
    : match.bottom_player_username ?? `Player ${match.bottom_player_id}`
  const opponentIsBot = isBottom
    ? match.top_player_is_bot === true
    : match.bottom_player_is_bot === true
  const result =
    match.status === 'active'
      ? 'Live'
      : match.winner_side === 'draw'
        ? 'Draw'
        : match.winner_side === playerSide
          ? 'Win'
          : 'Loss'

  return {
    id: match.id,
    playedAt: match.finished_at ?? match.started_at,
    opponent: opponentName,
    opponentIsBot,
    playerRating,
    opponentRating,
    result,
    ratingDelta: match.is_rated && match.status === 'finished' ? ratingDelta : null,
    opponentRatingDelta:
      match.is_rated && match.status === 'finished' ? opponentRatingDelta : null,
    isLive: match.status === 'active',
    mode: opponentIsBot ? 'Bot' : 'Online',
  }
}

export function buildRatingHistoryFromBackendMatches(matches, userId) {
  return matches
    .filter((match) => match.is_rated && match.status === 'finished')
    .sort((left, right) => {
      const leftTime = new Date(left.finished_at ?? left.started_at).getTime()
      const rightTime = new Date(right.finished_at ?? right.started_at).getTime()

      return leftTime - rightTime
    })
    .map((match) => {
      const entry = buildHistoryEntryFromBackendMatch(match, userId)

      return {
        id: match.id,
        playedAt: entry.playedAt,
        rating:
          typeof entry.playerRating === 'number' && typeof entry.ratingDelta === 'number'
            ? entry.playerRating + entry.ratingDelta
            : entry.playerRating,
      }
    })
}
