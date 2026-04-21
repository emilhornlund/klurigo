# Quiz Management Specification

## Purpose

Enables users to create, manage, and organize quiz content for the Klurigo platform. Supports multiple question types with various difficulty levels and supports both Classic and Zero-to-One-Hundred game modes.

Quizzes are the core content unit of the platform, containing questions, metadata (title, description, category), and settings that define how they're played in games.

## Requirements

### Requirement: Quiz Creation

The system MUST support creating new quizzes with multiple question types.

#### Scenario: Create classic mode quiz

- GIVEN a user wants to create a classic mode quiz
- WHEN the user submits quiz data including title, description, category, and questions
- THEN the system validates all required fields
- AND creates a quiz document in storage
- AND returns the created quiz with unique identifier and metadata timestamps

#### Scenario: Create zero-to-one-hundred mode quiz

- GIVEN a user wants to create a zero-to-one-hundred mode quiz
- WHEN the user submits quiz data with appropriate range questions (0-100)
- THEN the system creates a quiz with mode set to ZeroToOneHundred
- AND enforces that only range-type questions are included

#### Scenario: Invalid question data

- GIVEN a user submits quiz creation with invalid question data (missing fields, wrong types)
- WHEN the request is processed
- THEN the system returns validation errors specifying issues
- AND no quiz is created

### Requirement: Quiz Retrieval

The system MUST support retrieving quiz details.

#### Scenario: Fetch quiz by ID

- GIVEN a user requests a specific quiz by its unique identifier
- WHEN the request includes valid authentication (if public or private)
- THEN the system returns the complete quiz document including all questions and settings
- AND includes author information and aggregated statistics

#### Scenario: Non-existent quiz

- GIVEN a request for a quiz ID that doesn't exist
- WHEN the request is processed
- THEN the system returns not found error

### Requirement: Quiz List Queries

The system MUST support paginated listing of quizzes.

#### Scenario: User's own quizzes

- GIVEN an authenticated user requests their authored quizzes
- WHEN the user specifies pagination parameters (offset, limit)
- THEN the system returns a page of quiz summaries with metadata
- AND includes total count for pagination UI

#### Scenario: Public quiz discovery

- GIVEN an unauthenticated user accesses public quizzes via discovery API
- WHEN the request is processed
- THEN the system returns publicly visible quizzes with aggregated stats
- AND excludes private quizzes from results

### Requirement: Quiz Updates

The system MUST support updating existing quizzes.

#### Scenario: Update quiz details

- GIVEN a quiz author wants to modify their quiz (title, description, questions)
- WHEN the user submits update data with valid quiz ID and authentication
- THEN the system validates changes against constraints
- AND updates the quiz document in storage
- AND updates the modified timestamp

#### Scenario: Mode change restriction

- GIVEN a user attempts to change a quiz's game mode after creation
- WHEN the update request is processed
- THEN the system may reject the change or create a new quiz version
- AND preserves original quiz integrity for existing games

### Requirement: Quiz Deletion

The system MUST support deleting quizzes.

#### Scenario: Delete owned quiz

- GIVEN a quiz author requests deletion of their own quiz
- WHEN the request includes valid authentication and quiz ID
- THEN the system deletes the quiz document from storage
- AND removes associated data (ratings, snapshots if not yet computed)
- AND returns success confirmation

#### Scenario: Deletion with existing games

- GIVEN a quiz has been used to create multiple games
- WHEN deletion is requested
- THEN the system may prevent deletion or mark as deleted
- AND preserves historical game data integrity

### Requirement: Quiz Categories and Metadata

The system MUST support categorizing quizzes for discovery and filtering.

#### Scenario: Valid category assignment

- GIVEN a quiz creation request includes a valid category from allowed list
- WHEN the request is processed
- THEN the system accepts and stores the category
- AND ensures category matches enum values (GeneralKnowledge, Science, History, etc.)

#### Scenario: Invalid category

- GIVEN a quiz creation request includes an unrecognized category value
- WHEN the request is processed
- THEN the system returns validation error with valid options

### Requirement: Quiz Visibility Control

The system MUST support public and private quiz visibility.

#### Scenario: Create public quiz

- GIVEN a user creates a quiz with public visibility
- WHEN the quiz is saved
- THEN the quiz appears in discovery feeds and search results
- AND can be discovered by other users

#### Scenario: Create private quiz

- GIVEN a user creates a quiz with private visibility
- WHEN the quiz is saved
- THEN the quiz only appears in author's profile
- AND does not appear in discovery or public listings

### Requirement: Quiz Ratings and Statistics

The system MUST maintain aggregated statistics for quizzes.

#### Scenario: Gameplay aggregation

- GIVEN completed games have been played using a quiz
- WHEN game results are processed
- THEN the system updates play count, total players, and difficulty estimate
- AND stores these aggregates in quiz document

#### Scenario: Rating calculation

- GIVEN users submit star ratings (1-5) with optional comments for a quiz
- WHEN ratings are submitted
- THEN the system calculates and updates average rating
- AND maintains total rating count including comment counts

### Requirement: Question Types Support

The system MUST support multiple question types for quiz creation.

#### Scenario: Multi-choice questions

- GIVEN a user adds multi-choice questions to a quiz
- WHEN the question includes correct answer options
- THEN the system validates all options are provided and distinct
- AND stores question with correct answer index

#### Scenario: True/false questions

- GIVEN a user adds true/false questions
- WHEN the question is submitted
- THEN the system accepts boolean answer (true or false)
- AND validates format matches expected structure

#### Scenario: Range questions

- GIVEN a user adds range questions for classic mode
- WHEN the question includes min, max, step values
- THEN the system validates numeric constraints and stores

#### Scenario: Type-answer questions

- GIVEN a user adds type-answer questions (text input)
- WHEN the question is submitted
- THEN the system accepts string answer and normalizes whitespace
- AND stores exact match criteria

#### Scenario: Pin questions

- GIVEN a user adds pin location questions with image
- WHEN the question includes correct X/Y coordinates and tolerance level
- THEN the system validates coordinate ranges (0.0-1.0) and tolerance presets

#### Scenario: Puzzle questions

- GIVEN a user adds puzzle ordering questions
- WHEN the question includes answer values array
- THEN the system stores correct sequence for validation
