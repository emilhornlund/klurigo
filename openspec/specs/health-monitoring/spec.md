# Health & Monitoring Specification

## Purpose

Provides system health indicators, error handling, and operational monitoring for the Klurigo platform. Ensures service availability through health check endpoints, handles exceptions consistently across the API, enforces rate limiting to prevent abuse, and integrates with external monitoring services (Sentry) in production.

This capability spans infrastructure-level concerns including database connectivity, Redis connections, and application-level metrics.

## Requirements

### Requirement: Health Check Endpoints

The system MUST provide health check endpoints for service availability monitoring.

#### Scenario: Basic health status

- GIVEN a request is made to the health endpoint
- WHEN the request is processed
- THEN the system returns 200 OK with service status (UP/DOWN)
- AND includes timestamp of health check

#### Scenario: Redis health indicator

- GIVEN a Redis connection health check runs
- WHEN the indicator executes
- THEN the system returns healthy if Redis responds within timeout
- AND unhealthy if connection fails or times out

### Requirement: Exception Handling

The system MUST handle exceptions consistently across all API endpoints.

#### Scenario: Global exception filter

- GIVEN any request results in an unhandled exception
- WHEN the error propagates to the filter
- THEN the system catches the exception and returns standardized error response
- AND includes appropriate HTTP status code (4xx, 5xx)
- AND logs error with context for debugging

#### Scenario: Custom exceptions

- GIVEN domain-specific exceptions are thrown (PlayerNotFoundException, etc.)
- WHEN the exception is caught
- THEN the system maps to appropriate HTTP status and message
- AND preserves exception type information in error response

### Requirement: Request Timeout Handling

The system MUST enforce configurable request timeouts.

#### Scenario: Default timeout

- GIVEN a request exceeds configured timeout duration
- WHEN the timeout threshold is reached
- THEN the system terminates the request processing
- AND returns 503 Service Unavailable or 408 Request Timeout status
- AND logs timeout event

### Requirement: Rate Limiting

The system MUST limit request frequency to prevent abuse and ensure fair usage.

#### Scenario: Short-term throttling

- GIVEN a client exceeds short-throttler limits (e.g., 10 requests per 1 second)
- WHEN threshold is exceeded
- THEN the system returns 429 Too Many Requests response
- AND includes retry-after header with suggested wait time

#### Scenario: Medium-term throttling

- GIVEN a client exceeds medium-throttler limits (e.g., 20 requests per 10 seconds)
- WHEN threshold is exceeded
- THEN the system enforces rate limit
- AND may apply progressive delays

#### Scenario: Long-term throttling

- GIVEN a client exceeds long-throttler limits (e.g., 100 requests per 60 seconds)
- WHEN threshold is exceeded
- THEN the system applies stricter limiting or blocks temporarily

### Requirement: Redis-Based Throttling Storage

The system MUST use Redis for distributed rate limit tracking.

#### Scenario: Multi-instance coordination

- GIVEN multiple application instances handle requests
- WHEN throttling counters are updated
- THEN all instances share the same rate limit state via Redis
- AND clients cannot bypass limits by switching between instances

### Requirement: Sentry Integration (Production)

The system MUST integrate with Sentry for error tracking in production.

#### Scenario: Error capture

- GIVEN an exception occurs in production environment
- WHEN the error is thrown
- THEN the system sends error details to Sentry including stack trace
- AND includes contextual information (user, request data if applicable)

#### Scenario: Performance monitoring

- GIVEN Sentry is configured for performance tracking
- WHEN requests complete
- THEN the system may send transaction traces to Sentry
- AND tracks request duration and error rates

### Requirement: CORS Configuration

The system MUST configure Cross-Origin Resource Sharing appropriately.

#### Scenario: Allowed origins

- GIVEN a request includes Origin header
- WHEN the server checks allowed origins
- THEN the system validates against configured SERVER_ALLOW_ORIGIN
- AND returns appropriate CORS headers in response

### Requirement: Request Validation

The system MUST validate incoming requests before processing.

#### Scenario: DTO validation pipes

- GIVEN a request body is parsed
- WHEN validation runs
- THEN the system applies class-validator decorators on DTOs
- AND rejects invalid data with 400 Bad Request

#### Scenario: Path and query parameter validation

- GIVEN parameters are extracted from URL
- WHEN validation runs
- THEN the system validates types and formats (e.g., UUID format for IDs)
- AND returns appropriate error messages

### Requirement: Logging

The system MUST log operational events for monitoring and debugging.

#### Scenario: Application startup

- GIVEN the application initializes
- WHEN bootstrap completes
- THEN the system logs successful startup with port information
- AND includes environment context (development/production/test)

#### Scenario: Error logging

- GIVEN an error occurs
- WHEN exception is caught
- THEN the system logs error level, message, and stack trace
- AND includes correlation ID if available for request tracing
