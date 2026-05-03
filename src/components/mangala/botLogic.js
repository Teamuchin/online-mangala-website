import { getLegalMoves } from './gameLogic.js'

export function chooseBotMove(board) {
  const legalMoves = getLegalMoves(board, 'top')

  if (legalMoves.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * legalMoves.length)

  return legalMoves[randomIndex]
}
