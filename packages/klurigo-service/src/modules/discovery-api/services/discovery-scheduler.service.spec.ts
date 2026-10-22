import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { DiscoveryComputeService } from './discovery-compute.service'
import { DiscoverySchedulerService } from './discovery-scheduler.service'

// Avoid depending on MurLock implementation details in a unit test.
// We only want to test the business logic inside `refreshSnapshot()`.
jest.mock('murlock', () => ({
  MurLock:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}))

describe(DiscoverySchedulerService.name, () => {
  let service: DiscoverySchedulerService
  let computeService: jest.Mocked<DiscoveryComputeService>
  let configService: jest.Mocked<ConfigService>

  const createModule = async (seedOnInit: boolean) => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscoverySchedulerService,
        {
          provide: DiscoveryComputeService,
          useValue: {
            compute: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(seedOnInit),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(DiscoverySchedulerService)
    computeService = moduleRef.get(DiscoveryComputeService)
    configService = moduleRef.get(ConfigService)
  }

  describe('onModuleInit', () => {
    it('calls compute() and logs when DISCOVERY_SEED_ON_INIT is true', async () => {
      await createModule(true)
      computeService.compute.mockResolvedValueOnce(undefined)

      const logSpy = jest
        .spyOn((service as any).logger as Logger, 'log')
        .mockImplementation(() => undefined)

      await service.onModuleInit()

      expect(configService.get).toHaveBeenCalledWith('DISCOVERY_SEED_ON_INIT')
      expect(computeService.compute).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledTimes(2)
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        'DISCOVERY_SEED_ON_INIT is enabled — running initial discovery snapshot computation.',
      )
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        'Initial discovery snapshot computation completed.',
      )
    })

    it('does not call compute() when DISCOVERY_SEED_ON_INIT is false', async () => {
      await createModule(false)

      await service.onModuleInit()

      expect(computeService.compute).not.toHaveBeenCalled()
    })
  })

  describe('refreshSnapshot', () => {
    beforeEach(async () => {
      await createModule(false)
    })

    it('calls compute() on cron tick and logs start/completion', async () => {
      computeService.compute.mockResolvedValueOnce(undefined)

      const logSpy = jest
        .spyOn((service as any).logger as Logger, 'log')
        .mockImplementation(() => undefined)

      await service.refreshSnapshot()

      expect(computeService.compute).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledTimes(2)
      expect(logSpy).toHaveBeenNthCalledWith(
        1,
        'Starting discovery snapshot computation.',
      )
      expect(logSpy).toHaveBeenNthCalledWith(
        2,
        'Discovery snapshot computation completed.',
      )
    })

    it('propagates errors from compute()', async () => {
      const err = new Error('compute failed')
      computeService.compute.mockRejectedValueOnce(err)

      const logSpy = jest
        .spyOn((service as any).logger as Logger, 'log')
        .mockImplementation(() => undefined)
      const errorSpy = jest
        .spyOn((service as any).logger as Logger, 'error')
        .mockImplementation(() => undefined)

      await expect(service.refreshSnapshot()).rejects.toThrow('compute failed')

      expect(computeService.compute).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Discovery snapshot computation failed.',
          operation: 'refreshSnapshot',
          errorCategory: 'unexpected',
        }),
      )
      expect(logSpy).toHaveBeenCalledWith(
        'Starting discovery snapshot computation.',
      )
    })
  })
})
