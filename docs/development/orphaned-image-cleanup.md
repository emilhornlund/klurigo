# Orphaned Image Cleanup

The backend reconciles files below `UPLOAD_DIRECTORY` with the image URLs
persisted on every quiz. It considers quiz covers, question media URLs, and Pin
question backgrounds. Managed URLs are recognized by the `/uploads/images/`
route and the upload filename layout, independent of the hostname saved in the
quiz. External image URLs, including Pexels URLs, are ignored.

## Schedule and safety

The service runs daily at **03:30 UTC**. It scans only direct user directories
and UUID-named `.webp` files, skips symlinks and recently-touched files, and
rechecks MongoDB references before each removal. Database errors abort deletion.
Quiz repository writes and the scheduled cleanup use the same Redis-backed
distributed lock, preventing a quiz reference from being added between the
final check and unlinking. The lock is shared by backend instances using the
configured Redis database. All instances must use the same Redis lock namespace
and shared upload storage for safe operation; do not run mixed versions that do
not participate in this lock while automatic deletion is enabled.

## Configuration

| Environment variable             | Default | Description                                                    |
| -------------------------------- | ------- | -------------------------------------------------------------- |
| `ORPHANED_IMAGE_RETENTION_DAYS`  | `7`     | Minimum age in days before an unreferenced upload is eligible. |
| `ORPHANED_IMAGE_CLEANUP_DRY_RUN` | `true`  | Scan and report candidates without deleting.                   |

The age check uses the most recent of file modification, metadata-change, and
birth timestamps to conservatively protect recent uploads. The first
deployment should retain dry-run mode. Inspect the `orphaned_image_cleanup_complete`
structured log event (candidate count and `bytesPotentiallyReclaimable`) for
several daily runs and confirm the identified candidates are expected. Enable
deletion by setting `ORPHANED_IMAGE_CLEANUP_DRY_RUN=false` only after review.
Restore `true` to pause deletion; set a larger retention value to increase the
grace period. Successful executions report scanned/referenced files, candidate,
deleted, skipped, and failure counts, reclaimed/potential bytes, dry-run state,
and duration. A failed reference scan emits `orphaned_image_cleanup_failed`
and leaves candidates untouched.

The Redis lock has a one-hour lease. Cleanup runs must complete within that
lease; investigate repeated long-running jobs before increasing storage scale.
Ensure the upload directory is a persistent shared volume when multiple backend
instances serve the same uploads.
