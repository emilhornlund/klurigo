# User Management Specification

## Purpose

Manages user profiles, account settings, and public profile information for the Klurigo platform. Supports both local (email/password) and Google OAuth users, maintaining consistent profile structure regardless of authentication provider.

User profiles store personal information, authentication metadata, and aggregated statistics about quiz authorship and game participation. Public profiles expose a subset of data to other users for discovery and recognition purposes.

## Requirements

### Requirement: Profile Creation

The system MUST create user profiles during registration with essential profile data.

#### Scenario: Registration with profile

- GIVEN a new user registers with email/password or Google OAuth
- WHEN the account is created
- THEN the system stores the user's basic profile information (email, names, nickname)
- AND initializes account metadata (created timestamp, auth provider)

#### Scenario: Profile for existing Google user

- GIVEN a user logs in via Google OAuth and an account with matching email exists
- WHEN the login request is processed
- THEN the system associates the Google authentication with the existing local profile
- AND updates the auth provider to GOOGLE

### Requirement: Retrieve User Profile

The system MUST allow users to retrieve their own profile information.

#### Scenario: Fetch current user profile

- GIVEN an authenticated user makes a profile retrieval request
- WHEN the request includes a valid access token
- THEN the system returns the complete user profile including email, names, nickname, and auth provider
- AND the response includes timestamps for account creation and last update

#### Scenario: Unauthenticated profile access attempt

- GIVEN an unauthenticated request attempts to fetch user profile
- WHEN the request is processed
- THEN the system rejects the request with an unauthorized error

### Requirement: Update User Profile

The system MUST allow users to update their profile information.

#### Scenario: Update local user profile

- GIVEN an authenticated local user submits profile updates (email, names, nickname)
- WHEN the update request includes a valid access token
- THEN the system validates and applies the requested changes
- AND returns the updated profile with modified timestamps
- AND if email is changed, sends verification to the new address

#### Scenario: Update Google user profile

- GIVEN an authenticated Google OAuth user submits profile updates
- WHEN the update request includes only allowed fields (nickname)
- THEN the system applies the nickname change
- AND rejects attempts to modify email or auth provider fields

### Requirement: Update User Password

The system MUST allow users to change their password.

#### Scenario: Successful password change

- GIVEN an authenticated local user submits current and new passwords
- WHEN the request includes the correct current password
- THEN the system updates the hashed password in storage
- AND returns success confirmation
- AND any existing refresh tokens remain valid (optional behavior)

#### Scenario: Incorrect current password

- GIVEN a user submits an incorrect current password for change request
- WHEN the request is processed
- THEN the system rejects with an unauthorized error
- AND no password change occurs

### Requirement: Public Profile Display

The system MUST expose public profile summaries for other users.

#### Scenario: Fetch public user profile by ID

- GIVEN another user requests a public profile
- WHEN the request includes the target user's unique identifier
- THEN the system returns a public profile summary (nickname, quizzes count, hosted/played games)
- AND does NOT expose email or authentication details

#### Scenario: Non-existent user profile

- GIVEN a request for a user ID that doesn't exist
- WHEN the request is processed
- THEN the system returns not found error
- OR returns an empty public profile response

### Requirement: Profile Statistics Aggregation

The system MUST maintain and expose aggregated statistics about user activity.

#### Scenario: Quiz author count

- GIVEN a user has authored multiple quizzes
- WHEN the public profile is retrieved
- THEN the system includes accurate count of published (public or private) quizzes

#### Scenario: Game participation statistics

- GIVEN a user has participated in games as both host and player
- WHEN the public profile is retrieved
- THEN the system tracks and returns hosted games count
- AND tracks and returns played games count (as player)

### Requirement: Profile Nickname Uniqueness

The system MUST ensure nickname uniqueness within game contexts.

#### Scenario: Unique nickname requirement

- GIVEN a user attempts to join a game with a nickname already in use by another participant
- WHEN the join request is processed
- THEN the system rejects the request with a conflict error
- AND suggests or requires an alternative nickname

#### Scenario: Nickname update

- GIVEN a user updates their default nickname in profile settings
- WHEN the update is successful
- THEN the new nickname is used for future game participations
