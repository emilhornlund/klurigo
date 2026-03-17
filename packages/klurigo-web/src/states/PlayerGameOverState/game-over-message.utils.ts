export const GAME_OVER_MESSAGES = {
  1: [
    'Champion! You finished the game in first place!',
    'Outstanding performance! You take the top spot!',
    'Incredible! You won the game and claimed first place!',
  ],
  2: [
    'Amazing effort! You secured second place!',
    'So close to the top! A fantastic second-place finish!',
    'Runner-up! An excellent performance!',
  ],
  3: [
    'Great job! You finished third and made the podium!',
    'A strong finish! Third place is yours!',
    'Well played! You secured the bronze position!',
  ],
  defaultTop10: [
    'Great game! You finished in the top 10!',
    'Solid performance! A top 10 finish!',
    'Well done! You made it into the top 10!',
  ],
  defaultTop20: [
    'Nice effort! You finished in the top 20!',
    'Good game! A respectable top 20 finish!',
    'You held your ground and finished in the top 20!',
  ],
  defaultBelow20: [
    'Thanks for playing! Every game is a chance to improve!',
    'Good effort! Keep playing and climb the leaderboard next time!',
    'Nice try! The next game is your chance to rise in the ranks!',
  ],
}

const getRandomMessage = (messages: string[]) => {
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

export const getGameOverMessage = (rank: number) => {
  if (rank === 1) {
    return getRandomMessage(GAME_OVER_MESSAGES[1])
  } else if (rank === 2) {
    return getRandomMessage(GAME_OVER_MESSAGES[2])
  } else if (rank === 3) {
    return getRandomMessage(GAME_OVER_MESSAGES[3])
  } else if (rank > 3 && rank <= 10) {
    return getRandomMessage(GAME_OVER_MESSAGES.defaultTop10)
  } else if (rank > 10 && rank <= 20) {
    return getRandomMessage(GAME_OVER_MESSAGES.defaultTop20)
  } else {
    return getRandomMessage(GAME_OVER_MESSAGES.defaultBelow20)
  }
}
