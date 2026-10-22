import { Inject } from '@nestjs/common'
import { MurLockService } from 'murlock'

/**
 * Applies MurLock with its watchdog enabled for work that can outlast its lease.
 * The inherited service proxy keeps auto-extension scoped to this method rather
 * than changing lease behavior for every MurLock user in the application.
 */
export function MurLockWithAutoExtend(
  releaseTime: number,
  lockKey: string,
): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    Inject(MurLockService)(target, 'murlockServiceDecorator')

    const originalMethod = descriptor.value as (...args: unknown[]) => unknown
    descriptor.value = function (
      this: { murlockServiceDecorator: MurLockService },
      ...args: unknown[]
    ) {
      const lockService = this.murlockServiceDecorator
      const autoExtendingLockService = Object.create(
        lockService,
      ) as MurLockService
      Object.defineProperty(autoExtendingLockService, 'options', {
        value: { ...lockService.options, autoExtend: true },
      })

      return autoExtendingLockService.runWithLock(lockKey, releaseTime, () =>
        originalMethod.apply(this, args),
      )
    }

    return descriptor
  }
}
