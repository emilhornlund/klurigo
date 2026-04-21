# Authentication & Authorization Specification

## Purpose

Provides secure user authentication and authorization for the Klurigo platform. Supports both local email/password accounts and Google OAuth2 authentication with PKCE, managing access tokens for user API interactions and game-level authentication.

The system issues short-lived JWT access tokens and longer-lived refresh tokens, maintaining separate token scopes for user operations (user scope) and real-time game participation (game scope). This separation ensures that game sessions can operate independently without exposing user credentials.

## Requirements

### Requirement: User Registration

The system MUST support creating new user accounts with email/password authentication.

#### Scenario: Successful registration

- GIVEN a new user provides valid registration data (email, password, default nickname)
- WHEN the user submits the registration request
- THEN the system creates a new user account with the provided details
- AND returns a user response containing the unique identifier, email, and timestamp
- AND sends a verification email to the user's address

#### Scenario: Registration with existing email

- GIVEN a user attempts to register with an email already in use
- WHEN the registration request is submitted
- THEN the system rejects the request with a conflict error
- AND no duplicate account is created

#### Scenario: Missing required fields

- GIVEN a user submits registration without required fields (email, password, nickname)
- WHEN the request is processed
- THEN the system returns a validation error specifying missing fields

### Requirement: Local Authentication (Email/Password)

The system MUST authenticate users with email and password credentials.

#### Scenario: Successful login

- GIVEN a registered user provides correct email and password
- WHEN the user submits a login request
- THEN the system returns an authentication response with access and refresh tokens
- AND the access token has a short expiration (e.g., 15 minutes)
- AND the refresh token has a longer expiration (e.g., 7 days)

#### Scenario: Invalid credentials

- GIVEN a user provides incorrect password or non-existent email
- WHEN the login request is submitted
- THEN the system rejects the request with an unauthorized error
- AND no tokens are issued

#### Scenario: Password reset flow

- GIVEN a registered user requests a password reset
- WHEN the user submits their email address
- THEN the system sends a password reset link to the user's email
- AND the link contains a time-limited reset token

### Requirement: Google OAuth2 Authentication

The system MUST support authentication via Google OAuth2 with PKCE.

#### Scenario: Successful Google login flow

- GIVEN a user initiates Google OAuth and completes consent at Google
- WHEN the frontend exchanges the authorization code and PKCE verifier
- THEN the system validates the credentials with Google's OAuth endpoint
- AND returns an authentication response with access and refresh tokens
- AND creates or updates the user account based on Google profile data

#### Scenario: Invalid Google authorization code

- GIVEN a user submits an expired or already-used authorization code
- WHEN the exchange request is processed
- THEN the system rejects the request with an unauthorized error
- AND no tokens are issued

### Requirement: Token Refresh

The system MUST allow refreshing expired access tokens using refresh tokens.

#### Scenario: Valid refresh token

- GIVEN a user has a valid refresh token (not expired or revoked)
- WHEN the user submits a refresh request with the refresh token
- THEN the system issues new access and refresh tokens
- AND the old refresh token is invalidated (one-time use refresh)

#### Scenario: Expired refresh token

- GIVEN a user submits a refresh request with an expired refresh token
- WHEN the request is processed
- THEN the system rejects the request with an unauthorized error
- AND the user must re-authenticate

### Requirement: Token Revoke

The system MUST invalidate tokens upon explicit revocation requests.

#### Scenario: User logout (user scope)

- GIVEN a user with active access and refresh tokens
- WHEN the user submits a revoke request for their token
- THEN the system invalidates both tokens server-side
- AND clears all related session state

#### Scenario: Game session revocation

- GIVEN a game has active authentication tokens
- WHEN the host terminates the game or expires the session
- THEN the system invalidates the game-scoped tokens
- AND prevents further game participation with those tokens

### Requirement: Email Verification

The system MUST verify user email addresses for local accounts.

#### Scenario: Successful verification

- GIVEN a user receives a verification email with a unique token
- WHEN the user submits the verification token to the API
- THEN the system marks the email as verified in the user record
- AND allows full access to user features

#### Scenario: Invalid or expired verification token

- GIVEN a user submits an invalid or expired verification token
- WHEN the verification request is processed
- THEN the system rejects the request with an error
- AND allows resending of verification emails

### Requirement: Game-Level Authentication

The system MUST support authenticating game participants (hosts and players).

#### Scenario: Host authentication

- GIVEN a quiz creator initiates a new game session
- WHEN the game is created
- THEN the system generates game-specific JWT tokens with game scope
- AND returns the tokens in the game creation response

#### Scenario: Player joining a game

- GIVEN a player knows a valid 6-digit game PIN or has the game ID
- WHEN the player submits authentication credentials
- THEN the system validates the credentials and issues game-scoped tokens
- AND adds the player to the active game participants list

### Requirement: Token Scope Isolation

The system MUST maintain strict separation between user-scoped and game-scoped tokens.

#### Scenario: Cross-scope token rejection

- GIVEN a request uses tokens from the wrong scope (e.g., game token for user profile API)
- WHEN the request is authenticated
- THEN the system rejects the request with an unauthorized error
- AND access to protected resources is denied

### Requirement: Security Best Practices

The system MUST implement security best practices for authentication.

#### Scenario: Password hashing

- GIVEN a new user registers or updates their password
- WHEN the password is stored
- THEN the system hashes the password using bcrypt or equivalent
- AND plain-text passwords are never stored

#### Scenario: Rate limiting

- GIVEN multiple rapid authentication attempts (e.g., brute force)
- WHEN request thresholds are exceeded
- THEN the system temporarily blocks further requests from that source
- AND returns appropriate error responses
