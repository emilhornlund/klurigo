# Media Management Specification

## Purpose

Handles uploading, storage, and serving of media assets (images, videos, audio) associated with quizzes. Supports multiple media types that can be embedded in questions to create rich interactive quiz experiences.

The system provides secure upload endpoints, stores files in configured directories, and serves them via dedicated media URLs for use in question content.

## Requirements

### Requirement: Media Upload

The system MUST accept media uploads from authenticated users.

#### Scenario: Image upload

- GIVEN an authenticated user submits image file for quiz question
- WHEN the request includes valid authentication token
- THEN the system validates file type (image/jpeg, image/png, etc.)
- AND stores file in configured upload directory with unique identifier
- AND returns media response containing public URL for access

#### Scenario: Video upload

- GIVEN an authenticated user submits video file
- WHEN the request is processed
- THEN the system accepts video formats (mp4, webm, ogg)
- AND validates file size against configuration limits
- AND returns video URL in response

#### Scenario: Audio upload

- GIVEN an authenticated user submits audio file
- WHEN the request is processed
- THEN the system accepts audio formats (mp3, wav, ogg)
- AND stores file with appropriate MIME type metadata
- AND returns playable audio URL

### Requirement: Media Type Validation

The system MUST validate media types against allowed list.

#### Scenario: Supported media types

- GIVEN a media upload request
- WHEN the system checks media type
- THEN it accepts Image, Video, and Audio from MediaType enum
- AND rejects unsupported formats

#### Scenario: Invalid file extension

- GIVEN an upload with unrecognized file extension
- WHEN validation runs
- THEN the system returns error specifying acceptable types

### Requirement: Media URLs

The system MUST provide public access to uploaded media.

#### Scenario: Image URL access

- GIVEN a client requests image URL from media endpoint
- WHEN the request includes valid image identifier
- THEN the system serves the image with appropriate Content-Type header
- AND supports browser rendering directly

#### Scenario: Video/audio streaming

- GIVEN a client requests video or audio URL
- WHEN the request is made
- THEN the system enables HTTP range requests for streaming
- AND sets appropriate content-disposition headers

### Requirement: Pexels Integration

The system MAY integrate with Pexels API for image search.

#### Scenario: Image search by query

- GIVEN an authenticated user searches for quiz-related images
- WHEN the request includes search term and pagination parameters
- THEN the system queries Pexels API
- AND returns matching images with attribution information
- AND may cache results to reduce external API calls

### Requirement: Media Storage Configuration

The system MUST support configurable media storage.

#### Scenario: Upload directory

- GIVEN system configuration specifies UPLOAD_DIRECTORY
- WHEN files are stored
- THEN the system saves uploaded media in configured path
- AND uses unique filenames to prevent collisions

### Requirement: Media Cleanup

The system SHOULD handle orphaned or deleted media references.

#### Scenario: Quiz deletion with images

- GIVEN a quiz containing embedded images is deleted
- WHEN cleanup runs (if implemented)
- THEN the system may mark images as orphaned or remove them
- AND updates storage to free space

### Requirement: Media Metadata

The system MAY store metadata about uploaded media.

#### Scenario: File size tracking

- GIVEN an upload completes
- WHEN metadata is recorded
- THEN the system stores file size in bytes
- AND may include dimensions for images (width, height)

#### Scenario: Original filename preservation

- GIVEN an upload includes original filename
- WHEN storing metadata
- THEN the system optionally preserves original name alongside stored identifier
