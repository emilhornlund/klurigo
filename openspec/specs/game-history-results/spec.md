# Game History & Results Specification

## Purpose

Manages the persistence, retrieval, and analysis of completed game sessions for both hosts and players. Tracks historical gameplay data, calculates player statistics (ranks, scores, streaks), and enables post-game rating of quizzes.

This capability bridges real-time gameplay with persistent records, allowing users to review their performance history, analyze trends, and provide feedback on quiz quality after games conclude.

## Requirements

### Requirement: Game History Retrieval

The system MUST allow participants to retrieve their game history.

#### Scenario: Player's game history

- GIVEN an authenticated user requests their participation history
- WHEN the request includes pagination parameters (offset, limit)
- THEN the system returns paginated list of games where user participated
- AND each game includes identifier, name, mode, status, and quiz image URL

#### Scenario: Host vs player view

- GIVEN a user has participated both as host and player in different games
- WHEN history is retrieved
- THEN the system correctly identifies participant type for each game
- AND returns appropriate fields (rank/score for players, basic info for hosts)

#### Scenario: Completed status determination

- GIVEN a request for active game history
- WHEN processing results
- THEN the system maps Active games with Podium task to Completed status
- AND preserves Active status for ongoing games

### Requirement: Game Result Data

The system MUST include comprehensive result data for completed games.

#### Scenario: Player rank and score

- GIVEN a game has concluded
- WHEN player views final results
- THEN the response includes overall rank among all players
- AND total score accumulated during game
- AND total number of players in that game

#### Scenario: Streak tracking

- GIVEN a player's performance is processed
- WHEN streaks are calculated
- THEN the system tracks consecutive correct answers (currentStreak)
- AND may calculate comeback ranking gains for position improvements

### Requirement: Behind Leader Tracking

The system MAY track how far behind a player was from the leader.

#### Scenario: Points behind

- GIVEN a game has completed and final leaderboard is determined
- WHEN player's results are calculated
- THEN the response includes pointsBehind (if applicable)
- AND shows difference between player's score and winner's score

### Requirement: Quiz Rating After Game

The system MUST allow players to rate quizzes after completing games.

#### Scenario: Rate eligibility check

- GIVEN a game has completed
- WHEN checking rating permission
- THEN the system determines if user can rate (player in that game)
- AND returns canRateQuiz boolean in response

#### Scenario: Submit quiz rating

- GIVEN an eligible player submits star rating (1-5) with optional comment
- WHEN the request is processed
- THEN the system validates rating range and comment length
- AND updates aggregate ratings for the quiz
- AND returns success confirmation

### Requirement: Podium/Ceremony Data

The system MUST provide podium ceremony results showing top players.

#### Scenario: Final leaderboard

- GIVEN a game has completed and podium phase is reached
- WHEN results are retrieved
- THEN the system returns ordered leaderboard with position, nickname, score
- AND includes at least top 3 finishers for podium display

### Requirement: Game Status Tracking

The system MUST persist and return accurate game status.

#### Scenario: Status values

- GIVEN a completed game is queried
- WHEN status is retrieved
- THEN the response returns COMPLETED for finished games
- AND may include TERMINATED or EXPIRED for abnormal endings

#### Scenario: Historical queries

- GIVEN a user queries old game history
- WHEN the request includes various statuses
- THEN the system filters and returns appropriate subset based on criteria

### Requirement: Game Statistics Aggregation

The system MAY compute aggregate statistics across games.

#### Scenario: Difficulty estimation

- GIVEN multiple completed games for same quiz
- WHEN difficulty percentage is calculated
- THEN the system uses gameplay patterns to estimate relative difficulty
- AND stores in quiz's gameplaySummary

### Requirement: Results Page UI Data

The system MUST provide data necessary for game results page rendering.

#### Scenario: Player summary view

- GIVEN a player navigates to results page after game completion
- WHEN the page loads
- THEN the response includes final score, rank, streaks, behind leader info
- AND includes rating eligibility and any submitted ratings

#### Scenario: Host review view

- GIVEN a host reviews game results
- WHEN the request is processed
- THEN the system may include comprehensive statistics per question
- AND total player count, average scores, answer distributions
