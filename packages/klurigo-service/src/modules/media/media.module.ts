import { extname } from 'path'

import { UPLOAD_IMAGE_MAX_FILE_SIZE } from '@klurigo/common'
import { HttpModule } from '@nestjs/axios'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
import { ServeStaticModule } from '@nestjs/serve-static'
import { diskStorage } from 'multer'
import { v4 as uuidv4 } from 'uuid'

import { EnvironmentVariables } from '../../app/config'

import { MediaController } from './controllers'
import { MediaService, PexelsMediaSearchService } from './services'

/**
 * Module for managing media-related operations.
 */
@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        storage: diskStorage({
          destination: configService.get<string>('UPLOAD_DIRECTORY'),
          filename: (_, file, cb) =>
            cb(null, `${uuidv4()}${extname(file.originalname)}`),
        }),
        limits: {
          fileSize: UPLOAD_IMAGE_MAX_FILE_SIZE,
        },
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => [
        {
          rootPath: configService.get<string>('UPLOAD_DIRECTORY'),
          serveRoot: '/uploads/images',
        },
      ],
      inject: [ConfigService],
    }),
  ],
  controllers: [MediaController],
  providers: [Logger, ConfigService, MediaService, PexelsMediaSearchService],
  exports: [MediaService],
})
export class MediaModule {}
