import { Authority, TokenScope } from '@klurigo/common'
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { Timeout } from '../../../app/decorators'
import { User } from '../../../modules/user/repositories'
import {
  Principal,
  RequiredAuthorities,
  RequiresScopes,
} from '../../authentication/controllers/decorators'
import { ParseImageFilePipe } from '../pipes'
import { MediaService } from '../services'

import { ApiUploadedPhotoIdParam } from './decorators/api'
import { RouteUploadedPhotoIdParam } from './decorators/route'
import {
  MediaPhotoSearchPageFilter,
  MediaUploadPhotoResponse,
  PaginatedMediaPhotoSearchResponse,
} from './models'

/**
 * Controller for managing media-related operations.
 */
@ApiBearerAuth()
@ApiTags('media')
@RequiresScopes(TokenScope.User)
@RequiredAuthorities(Authority.Media)
@Controller('media')
export class MediaController {
  /**
   * Initializes the MediaController.
   *
   * @param {MediaService} mediaService - Service for managing media operations.
   */
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Searches for photos based on query parameters.
   *
   * @param filter - The search and pagination parameters.
   *
   * @returns A paginated list of photos matching the search criteria.
   */
  @Get('/photos')
  @ApiOperation({
    summary: 'Search for photos',
    description:
      'Retrieves photos based on the provided search term and pagination parameters.',
  })
  @ApiQuery({
    name: 'search',
    description: 'Filter photos by name or tags.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of photos to return per page.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of photos to skip before returning results.',
    required: false,
    type: Number,
  })
  @ApiBadRequestResponse({
    description: 'One or more search parameters are invalid.',
  })
  @ApiOkResponse({
    description: 'A paginated response containing photos.',
    type: PaginatedMediaPhotoSearchResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access to the endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'The token lacks the Media authority.',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 10, ttl: 60000 },
  })
  public searchPhotos(
    @Query(new ValidationPipe({ transform: true }))
    filter: MediaPhotoSearchPageFilter,
  ): Promise<PaginatedMediaPhotoSearchResponse> {
    return this.mediaService.searchPhotos(
      filter.search,
      filter.limit,
      filter.offset,
    )
  }

  /**
   * Uploads a photo, validates the file type and size, processes it (resize and convert to webp),
   * and returns the generated filename.
   *
   * @param file - The uploaded image file, processed and saved as webp.
   *
   * @returns An object containing the new filename of the uploaded and processed image.
   */
  @Timeout(60_000)
  @Post('/uploads/photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a photo',
    description:
      'Uploads a single image file, validates and processes it (resize and convert to .webp), and returns the new filename.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload (jpeg, png, gif, tiff, webp)',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Successfully uploaded and processed the image.',
    type: MediaUploadPhotoResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access to the endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'The token lacks the Media authority.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'The uploaded file was invalid or could not be processed.',
  })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  public async uploadPhoto(
    @UploadedFile(ParseImageFilePipe) file: string,
  ): Promise<MediaUploadPhotoResponse> {
    return { filename: file }
  }

  /**
   * Deletes an uploaded photo for the authenticated user.
   *
   * @param photoId - The unique ID of the uploaded photo to delete.
   * @param user - The authenticated user requesting the deletion.
   */
  @Delete('/uploads/photos/:photoId')
  @ApiUploadedPhotoIdParam()
  @ApiOperation({
    summary: 'Delete an uploaded photo',
    description: 'Deletes an uploaded photo owned by the authenticated user.',
  })
  @ApiNoContentResponse({
    description: 'Successfully deleted the uploaded photo.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized access to the endpoint.',
  })
  @ApiForbiddenResponse({
    description: 'The token lacks the Media authority.',
  })
  @ApiNotFoundResponse({
    description: 'The uploaded photo was not found.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteUploadedPhoto(
    @RouteUploadedPhotoIdParam() photoId: string,
    @Principal() user: User,
  ): Promise<void> {
    return this.mediaService.deleteUploadPhoto(photoId, user._id)
  }
}
