# Game Hosting & Playing Specification

## Purpose

Enables real-time game sessions where one user (host) creates a game from a quiz and other users (players) join to answer questions collaboratively. Supports synchronous gameplay with live leaderboards, question delivery via Server-Sent Events (SSE), and immediate feedback.

Each game has a unique 6-digit PIN for easy sharing and participation, maintaining separate authentication scopes for hosts (full control) and players (participation only).

## Requirements

### Requirement: Game Creation

The system MUST support creating new games from existing quizzes.

#### Scenario: Host creates game

- GIVEN an authenticated user with access to a quiz
- WHEN the user requests game creation for that quiz
- THEN the system generates a unique 6-digit PIN
- AND creates a game document with ACTIVE status
- AND issues host-scoped JWT tokens (access and refresh)
- AND returns game identifier and tokens

#### Scenario: Game creation from non-existent quiz

- GIVEN a request attempts to create a game from a quiz ID that doesn't exist
- WHEN the request is processed
- THEN the system returns not found error
- AND no game document is created

### Requirement: Player Joining

The system MUST allow players to join active games via PIN or game ID.

#### Scenario: Join by 6-digit PIN

- GIVEN a player knows a valid 6-digit game PIN
- WHEN the player submits authentication with nickname
- THEN the system validates PIN exists and game is ACTIVE
- AND adds player to participants list if nickname is unique
- AND issues player-scoped JWT tokens
- AND returns success response with tokens

#### Scenario: Join by game ID

- GIVEN a player has direct access to game identifier (not just PIN)
- WHEN the player submits authentication request with game ID
- THEN the system validates game exists and accepts players
- AND adds player if capacity allows

#### Scenario: Game full

- GIVEN an active game has reached maximum participant capacity
- WHEN a new player attempts to join
- THEN the system rejects with conflict error indicating game is full

#### Scenario: Duplicate nickname

- GIVEN multiple players attempt to use the same nickname in one game
- WHEN the second player submits join request
- THEN the system rejects with conflict error specifying nickname in use
- AND suggests or requires alternative nickname

### Requirement: Real-Time Event Delivery

The system MUST deliver real-time game events to participants via SSE.

#### Scenario: Host receives lobby events

- GIVEN a host has joined a newly created game
- WHEN players join or leave the game lobby
- THEN the system推送s GameLobbyHost events to the host's SSE stream
- AND includes current participant list with nicknames

#### Scenario: Player receives lobby events

- GIVEN a player has joined a game lobby
- WHEN the game begins
- THEN the system pushes GameLobbyPlayer and GameBeginPlayer events
- AND provides player nickname in event payload

#### Scenario: Question preview events

- GIVEN a game is in active state waiting for question
- WHEN host initiates question delivery
- THEN the system pushes GameQuestionPreviewHost and GameQuestionPreviewPlayer events
- AND includes countdown timer, pagination info, and question summary

### Requirement: Question Delivery

The system MUST support delivering questions to all participants.

#### Scenario: Multi-choice question

- GIVEN a multi-choice question is ready for delivery
- WHEN the host advances to question phase
- THEN the system pushes GameQuestionHost event with question details
- AND sets countdown timer for answer duration
- AND tracks submission counts in real-time

#### Scenario: True/false question

- GIVEN a true/false question is delivered
- WHEN the question reaches players
- THEN the system includes only two options (true/false)
- AND validates answers are boolean values

#### Scenario: Range question

- GIVEN a range question is delivered for classic mode
- WHEN the question is pushed to participants
- THEN the system includes min, max, step values
- AND accepts numeric answers within range

#### Scenario: Type-answer question

- GIVEN a type-answer question is delivered
- WHEN the question reaches players
- THEN the system displays text prompt
- AND accepts any string answer with whitespace normalization

### Requirement: Answer Submission

The system MUST collect and validate player answers.

#### Scenario: Valid answer submission

- GIVEN a player submits an answer before countdown expires
- WHEN the answer format matches question type
- THEN the system records the answer with timestamp
- AND updates submission counters in Redis for real-time visibility

#### Scenario: Late answer submission

- GIVEN a player attempts to submit answer after countdown timer expires
- WHEN the request is processed
- THEN the system rejects with error indicating time expired
- OR accepts late answers and marks as incorrect (configurable behavior)

### Requirement: Answer Validation

The system MUST validate submitted answers against correct answers.

#### Scenario: Multi-choice validation

- GIVEN a player submits multi-choice answer
- WHEN validation runs
- THEN the system compares submitted index to correct answer index
- AND records whether answer is correct

#### Scenario: Range validation

- GIVEN a player submits range answer (numeric value)
- WHEN validation runs
- THEN the system checks if answer falls within acceptable margin
- AND may include tolerance settings for close-but-not-perfect answers

#### Scenario: Type-answer validation

- GIVEN a player submits text answer
- WHEN validation runs
- THEN the system normalizes both stored and submitted strings (lowercase, trim)
- AND performs exact match comparison

### Requirement: Leaderboard Updates

The system MUST maintain and broadcast real-time leaderboard positions.

#### Scenario: Score calculation after question

- GIVEN a question period completes with results
- WHEN results are processed
- THEN the system calculates points awarded based on correctness and speed
- AND updates each player's total score in storage
- AND pushes GameLeaderboardHost event with updated rankings

#### Scenario: Position tracking

- GIVEN leaderboard is updated
- WHEN positions change between questions
- THEN the system tracks previous position for streak calculations
- AND includes position delta in leaderboard events

### Requirement: Game Completion

The system MUST handle game conclusion and result reporting.

#### Scenario: Quiz completion

- GIVEN all quiz questions have been answered by all participants
- WHEN final question results are processed
- THEN the system ends the game phase
- AND pushes GameOverPlayer event with final rankings, scores, and rank details

#### Scenario: Host termination

- GIVEN a host explicitly terminates an active game
- WHEN the termination request is processed
- THEN the system updates game status to TERMINATED
- AND notifies all participants of early end via GameQuitEvent

### Requirement: Game Status Management

The system MUST track and expose game state transitions.

#### Scenario: Status values

- GIVEN a game exists in one of defined states
- WHEN queried, game returns current status (ACTIVE, COMPLETED, EXPIRED, TERMINATED)
- AND status changes are persisted to storage

#### Scenario: Expired games

- GIVEN a game has exceeded its time-to-live without activity
- WHEN expiration check runs
- THEN the system updates game status to EXPIRED
- AND may perform cleanup of temporary data

### Requirement: Game Settings Configuration

The system MUST support configurable game settings.

#### Scenario: Randomize question order

- GIVEN host enables randomize question order setting
- WHEN game begins
- THEN the system shuffles question sequence before delivery
- AND applies same randomization to all participants

#### Scenario: Randomize answer order

- GIVEN host enables randomize answer order for multi-choice questions
- WHEN question is delivered
- THEN the system shuffles answer options before player sees them
- AND tracks original correct answer position separately

### Requirement: Participant Types

The system MUST distinguish between hosts and players.

#### Scenario: Host privileges

- GIVEN a user with host tokens makes game control request
- WHEN the request is processed
- THEN the system allows actions like advancing questions, viewing results early
- AND rejects same requests from player-scoped tokens

#### Scenario: Player limitations

- GIVEN a player attempts to perform host-only action
- WHEN the request includes player-scoped token
- THEN the system returns forbidden error
