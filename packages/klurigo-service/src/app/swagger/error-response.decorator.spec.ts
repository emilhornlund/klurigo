import { Controller, Get } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'

import {
  ApiBadRequestErrorResponse,
  ApiUnauthorizedErrorResponse,
} from './error-response.decorator'

@Controller('errors')
class ErrorResponseTestController {
  @Get()
  @ApiBadRequestErrorResponse()
  @ApiUnauthorizedErrorResponse({
    description: 'A domain-specific authentication failure.',
  })
  getError(): void {}
}

describe('error response Swagger decorators', () => {
  it('documents the shared error payload and optional validation errors', async () => {
    const module = await Test.createTestingModule({
      controllers: [ErrorResponseTestController],
    }).compile()
    const app = module.createNestApplication()

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    )
    const errorSchema = document.components?.schemas?.ErrorResponse
    const validationErrorSchema =
      document.components?.schemas?.ValidationErrorResponse
    const responses = document.paths['/errors']?.get?.responses

    expect(errorSchema).toMatchObject({
      type: 'object',
      required: ['message', 'status', 'timestamp'],
      properties: expect.objectContaining({
        message: expect.objectContaining({ type: 'string' }),
        status: expect.objectContaining({ type: 'number' }),
        validationErrors: expect.objectContaining({
          type: 'array',
          items: { $ref: '#/components/schemas/ValidationErrorResponse' },
        }),
        timestamp: expect.objectContaining({
          type: 'string',
          format: 'date-time',
        }),
      }),
    })
    expect(validationErrorSchema).toMatchObject({
      required: ['property', 'constraints'],
    })
    expect(responses?.['400']).toMatchObject({
      description: 'The request was invalid.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    })
    expect(responses?.['401']).toMatchObject({
      description: 'A domain-specific authentication failure.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    })

    await app.close()
  })
})
