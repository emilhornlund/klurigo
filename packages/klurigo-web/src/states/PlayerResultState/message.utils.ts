export const POSITION_MESSAGES = {
  1: {
    correct: [
      "You're on the podium! First place, and you nailed it!",
      'Champion! Top spot and a perfect answer!',
      "You're number one with the correct answer! Impressive!",
    ],
    'partially-correct': [
      "You're on the podium! First place, and you earned some points!",
      'Champion! Top spot with a pretty good answer!',
      'First place! You got some of that answer right!',
    ],
    incorrect: [
      "You're on the podium! First place, but you missed this one!",
      "Champion, but a wrong answer! You'll bounce back!",
      "Top spot, but this answer wasn't correct!",
    ],
  },
  2: {
    correct: [
      "You're on the podium! So close, second place with a correct answer!",
      'Runner-up with a perfect answer! Amazing job!',
      'Second place and you answered correctly!',
    ],
    'partially-correct': [
      "You're on the podium! Second place and some points for your answer!",
      'Runner-up with a partly right answer! Nice work!',
      'Second place! You got part of that answer right!',
    ],
    incorrect: [
      "You're on the podium! Second place, but a wrong answer!",
      'Runner-up, but you missed this one!',
      'Second place, but the answer wasn’t right.',
    ],
  },
  3: {
    correct: [
      "You're on the podium! Third place and a correct answer!",
      'A bronze finish with the right answer! Well done!',
      'Third place with a correct answer! Keep it up!',
    ],
    'partially-correct': [
      "You're on the podium! Third place and you got some points!",
      'A bronze finish with part of the answer right! Well done!',
      'Third place! You got some of that answer right!',
    ],
    incorrect: [
      "You're on the podium! Third place, but you missed it!",
      'A bronze finish, but wrong answer this time!',
      'Third place, but the answer was incorrect.',
    ],
  },
  defaultTop10: {
    correct: [
      'Great effort! Top 10 and you answered correctly!',
      'Top 10 finish with a correct answer! Keep pushing!',
      'You’re in the top 10 and nailed the answer!',
    ],
    'partially-correct': [
      'Great effort! Top 10 and you earned some points!',
      'Top 10 finish with part of the answer right! Keep pushing!',
      'You’re in the top 10 and got some of it right!',
    ],
    incorrect: [
      'Top 10 finish, but you missed the answer!',
      "You're in the top 10, but the answer wasn’t right!",
      "Great effort, but this answer wasn't correct.",
    ],
  },
  defaultTop20: {
    correct: [
      'Good job! Top 20 and you got it right!',
      "Top 20 finish and a correct answer! You're doing great!",
      'Solid performance, and you answered correctly!',
    ],
    'partially-correct': [
      'Good job! Top 20 and you picked up some points!',
      'Top 20 finish, and part of your answer was right!',
      'Solid performance! You got some of the answer right!',
    ],
    incorrect: [
      'Top 20 finish, but the answer wasn’t correct!',
      'Good job, but this one was wrong!',
      'Solid performance, but you missed the answer.',
    ],
  },
  defaultBelow20: {
    correct: [
      'Every game is a learning experience! You got it right this time!',
      'Keep pushing! You got the correct answer!',
      'Great effort! And you answered correctly!',
    ],
    'partially-correct': [
      'Every game is a learning experience! You earned some points!',
      'Keep pushing! You got part of the answer right!',
      'Great effort! You picked up points for part of that answer!',
    ],
    incorrect: [
      'Every game is a learning experience! Keep trying!',
      "Keep playing, and don't worry about this one!",
      "Great effort! You'll get it right next time!",
    ],
  },
}

const getRandomMessage = (messages: string[]) => {
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

export type PositionMessageCorrectness =
  'correct' | 'partially-correct' | 'incorrect'

export const getPositionMessage = (
  position: number,
  correctness: PositionMessageCorrectness,
) => {
  if (position === 1) {
    return getRandomMessage(POSITION_MESSAGES[1][correctness])
  } else if (position === 2) {
    return getRandomMessage(POSITION_MESSAGES[2][correctness])
  } else if (position === 3) {
    return getRandomMessage(POSITION_MESSAGES[3][correctness])
  } else if (position > 3 && position <= 10) {
    return getRandomMessage(POSITION_MESSAGES.defaultTop10[correctness])
  } else if (position > 10 && position <= 20) {
    return getRandomMessage(POSITION_MESSAGES.defaultTop20[correctness])
  } else {
    return getRandomMessage(POSITION_MESSAGES.defaultBelow20[correctness])
  }
}
