import {
  Authority,
  AuthProvider,
  TokenScope,
  UpdateGoogleUserProfileRequestDto,
} from '@klurigo/common'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger'

import {
  ApiBadRequestErrorResponse as ApiBadRequestResponse,
  ApiForbiddenErrorResponse as ApiForbiddenResponse,
  ApiNotFoundErrorResponse as ApiNotFoundResponse,
  ApiUnauthorizedErrorResponse as ApiUnauthorizedResponse,
} from '../../../app/decorators'
import {
  Principal,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { ParseUpdateUserProfileRequestPipe } from '../pipes'
import { User } from '../repositories'
import { UserService } from '../services'

import {
  UpdateGoogleUserProfileRequest,
  UpdateLocalUserProfileRequest,
  UserProfileResponse,
} from './models'

/**
 * Controller for managing user-profile-related operations.
 */
@ApiBearerAuth()
@ApiTags('user', 'profile')
@ApiExtraModels(UpdateLocalUserProfileRequest, UpdateGoogleUserProfileRequest)
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.User)
@Controller('/profile/user')
export class UserProfileController {
  /**
   * Initializes the UserProfileController.
   *
   * @param userService - Service for managing user-profile operations.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Retrieves the profile associated with the currently authenticated user.
   *
   * @param principal - The currently authenticated user making the request.
   * @returns The user's profile.
   * @throws UserNotFoundException If the user does not exist.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve the currently authenticated user’s profile',
    description:
      'Fetches the profile associated with the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the associated user’s profile.',
    type: UserProfileResponse,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'The user token lacks the required authority or scope.',
  })
  @ApiNotFoundResponse({
    description: 'The associated user was not found.',
  })
  @HttpCode(HttpStatus.OK)
  public async getUserProfile(
    @Principal() principal: User,
  ): Promise<UserProfileResponse> {
    return this.userService.findUserProfileOrThrow(principal._id)
  }

  /**
   * Updates the authenticated user's associated user-profile.
   *
   * @param principal - The authenticated user making the request.
   * @param request - The update details for the user profile.
   *
   * @returns The updated user details.
   * @throws UserNotFoundException If the user does not exist.
   */
  @Put()
  @ApiOperation({
    summary: 'Update the currently authenticated user’s profile',
    description:
      'Updates the profile associated with the currently authenticated user.',
  })
  @ApiBody({
    description: 'Payload containing the updated details for the user.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(UpdateLocalUserProfileRequest) },
        { $ref: getSchemaPath(UpdateGoogleUserProfileRequest) },
      ],
      discriminator: {
        propertyName: 'authProvider',
        mapping: {
          [AuthProvider.Local]: getSchemaPath(UpdateLocalUserProfileRequest),
          [AuthProvider.Google]: getSchemaPath(UpdateGoogleUserProfileRequest),
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The user profile payload is invalid.',
  })
  @ApiOkResponse({
    description: 'Successfully updated the user’s profile.',
    type: UserProfileResponse,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'The user token lacks the required authority or scope.',
  })
  @ApiNotFoundResponse({
    description: 'The profile associated with the user was not found.',
  })
  @HttpCode(HttpStatus.OK)
  public async updateUserProfile(
    @Principal() principal: User,
    @Body(new ParseUpdateUserProfileRequestPipe())
    request: UpdateLocalUserProfileRequest | UpdateGoogleUserProfileRequestDto,
  ): Promise<UserProfileResponse> {
    return await this.userService.updateUser(principal._id, request)
  }
}
