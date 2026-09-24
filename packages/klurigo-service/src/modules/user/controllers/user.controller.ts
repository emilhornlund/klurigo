import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import {
  ApiBadRequestErrorResponse as ApiBadRequestResponse,
  ApiConflictErrorResponse as ApiConflictResponse,
  ApiTooManyRequestsErrorResponse,
} from '../../../app/decorators'
import { Public } from '../../authentication/controllers/decorators'
import { UserService } from '../services'

import { CreateUserRequest, CreateUserResponse } from './models'

/**
 * Controller for user management endpoints.
 */
@ApiTags('user')
@Controller('users')
export class UserController {
  /**
   * Initializes the UserController.
   *
   * @param userService Service for user operations.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a new user account.
   *
   * @param createUserRequest DTO containing email, password, and optional names.
   * @returns The newly created user’s details.
   */
  @Public()
  @Post()
  @Throttle({
    short: { limit: 1, ttl: 1000 }, // 1 request per 1 000 ms (burst control)
    medium: { limit: 5, ttl: 1000 * 60 }, // 5 requests per 60 000 ms (human retries)
    long: { limit: 10, ttl: 1000 * 60 * 60 * 24 }, // 10 requests per 86 400 000 ms (per IP per day)
  })
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Registers a new user with email, password, and optional names.',
  })
  @ApiBody({
    description: 'Payload for creating a new user.',
    type: CreateUserRequest,
  })
  @ApiCreatedResponse({
    description: 'User successfully created.',
    type: CreateUserResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input.',
  })
  @ApiConflictResponse({
    description: 'User already exists.',
  })
  @ApiTooManyRequestsErrorResponse()
  @HttpCode(HttpStatus.CREATED)
  public async createUser(
    @Body() createUserRequest: CreateUserRequest,
  ): Promise<CreateUserResponse> {
    return this.userService.createUser(createUserRequest)
  }
}
