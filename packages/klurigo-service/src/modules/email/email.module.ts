import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MailerModule, type MailerOptions } from '@nestjs-modules/mailer'

import { EnvironmentVariables } from '../../app/config'

import { EmailService } from './services'

/**
 * Module for managing email-related operations.
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<EnvironmentVariables>) => ({
        transport: {
          host: 'smtp.mail.me.com',
          port: 587,
          ignoreTLS: false,
          secure: false,
          auth: {
            user: config.get('EMAIL_USERNAME'),
            pass: config.get('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@klurigo.com>',
        } as MailerOptions['defaults'],
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
