import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import {
  ApiDateTimeProperty,
  ApiEmailProperty,
  ApiNicknameProperty,
  ApiPaginationLimitProperty,
  ApiPaginationOffsetProperty,
  ApiPasswordProperty,
  ApiUuidProperty,
} from './property.decorators'

class PropertyDecoratorTestRequest {
  @ApiUuidProperty()
  id!: string

  @ApiDateTimeProperty()
  created!: Date

  @ApiEmailProperty()
  email!: string

  @ApiPasswordProperty()
  password!: string

  @ApiNicknameProperty()
  nickname!: string

  @ApiPaginationLimitProperty()
  limit?: number

  @ApiPaginationOffsetProperty()
  offset?: number
}

@Controller('property-decorators')
class PropertyDecoratorTestController {
  @Post()
  @ApiBody({ type: PropertyDecoratorTestRequest })
  create(@Body() request: PropertyDecoratorTestRequest): void {
    void request
  }
}

describe('reusable OpenAPI property decorators', () => {
  it('documents the same constraints enforced by validation', async () => {
    const module = await Test.createTestingModule({
      controllers: [PropertyDecoratorTestController],
    }).compile()
    const app = module.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Test').build(),
    )
    const schema = document.components?.schemas?.PropertyDecoratorTestRequest

    expect(schema).toMatchObject({
      required: ['id', 'created', 'email', 'password', 'nickname'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        created: { type: 'string', format: 'date-time' },
        email: {
          type: 'string',
          format: 'email',
          minLength: 6,
          maxLength: 128,
        },
        password: {
          type: 'string',
          format: 'password',
          writeOnly: true,
          minLength: 8,
          maxLength: 128,
        },
        nickname: {
          type: 'string',
          minLength: 2,
          maxLength: 20,
        },
        limit: { type: 'number', minimum: 5, maximum: 50 },
        offset: { type: 'number', minimum: 0 },
      },
    })

    const dto = plainToInstance(PropertyDecoratorTestRequest, {
      id: 'not-a-uuid',
      created: 'not-a-date',
      email: 'not-an-email',
      password: 'weak',
      nickname: '!',
      limit: '4',
      offset: '-1',
    })
    const errors = await validate(dto)

    expect(errors.map(({ property }) => property)).toEqual([
      'id',
      'created',
      'email',
      'password',
      'nickname',
      'limit',
      'offset',
    ])

    await app.close()
  })
})
