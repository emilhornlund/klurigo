import {
  type CrittersAvatarConfigurationV1,
  deepEqual,
  isCrittersAvatarConfigurationV1,
  randomizeCrittersAvatar,
  resolveGameAvatarSnapshot,
} from '@klurigo/common'

/** Reload-safe metadata for one game, participant, and account/guest scope. */
export interface JoinAvatarDraft {
  /** Current locally selected configuration. */
  readonly avatar: CrittersAvatarConfigurationV1
  /** Last loaded account default, or the guest's initial proposal. */
  readonly baseline: CrittersAvatarConfigurationV1
  /** Exact design confirmed by a successful account-avatar response. */
  readonly acknowledged?: CrittersAvatarConfigurationV1
}

/** Reads optional browser state; unavailable storage never blocks an in-memory draft. */
function readStoredDraft(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return undefined
  }
}

/** Rejects incomplete or unsupported browser state before it reaches the editor. */
function isAccountDraft(value: unknown): value is JoinAvatarDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Record<string, unknown>

  return (
    isCrittersAvatarConfigurationV1(draft.avatar) &&
    isCrittersAvatarConfigurationV1(draft.baseline) &&
    (draft.acknowledged === undefined ||
      isCrittersAvatarConfigurationV1(draft.acknowledged))
  )
}

/**
 * Restores an edited or acknowledged account draft, otherwise follows the profile.
 *
 * @param key - Identity-scoped browser storage key.
 * @param profileAvatar - Account metadata resolved from the authenticated profile.
 * @returns Complete metadata with enough state to avoid repeating confirmed saves.
 */
export function loadAccountJoinDraft(
  key: string,
  profileAvatar: unknown,
): JoinAvatarDraft {
  const baseline = resolveGameAvatarSnapshot(profileAvatar)

  // A newer saved recipe must not be replaced by a stale draft from this client.
  if (
    profileAvatar != null &&
    !isCrittersAvatarConfigurationV1(profileAvatar)
  ) {
    return { avatar: baseline, baseline }
  }

  const stored = readStoredDraft(key)

  if (isAccountDraft(stored)) {
    const hasEdits = !deepEqual(stored.avatar, stored.baseline)

    if (hasEdits || stored.acknowledged) {
      return {
        avatar: resolveGameAvatarSnapshot(stored.avatar),
        baseline,
        ...(stored.acknowledged
          ? { acknowledged: resolveGameAvatarSnapshot(stored.acknowledged) }
          : {}),
      }
    }
  }

  return { avatar: baseline, baseline }
}

/**
 * Restores a guest's existing design, generating only when no valid draft exists.
 *
 * @param key - Game/participant-scoped browser storage key.
 * @returns A complete guest draft with no account-save acknowledgement.
 */
export function loadGuestJoinDraft(key: string): JoinAvatarDraft {
  const stored = readStoredDraft(key)
  const avatar = isCrittersAvatarConfigurationV1(stored)
    ? resolveGameAvatarSnapshot(stored)
    : randomizeCrittersAvatar()

  return { avatar, baseline: avatar }
}

/**
 * Stores explicit choices without requiring browser storage to be available.
 *
 * @param key - Identity-scoped browser storage key.
 * @param draft - Complete local choices and any confirmed account save.
 * @param account - Whether the account retry envelope must be retained.
 */
export function storeJoinAvatarDraft(
  key: string,
  draft: JoinAvatarDraft,
  account: boolean,
): void {
  try {
    localStorage.setItem(key, JSON.stringify(account ? draft : draft.avatar))
  } catch {
    // Storage may be blocked or full. The mounted form retains its in-memory draft.
  }
}
