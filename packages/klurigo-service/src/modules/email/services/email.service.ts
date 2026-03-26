import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer'

import { EnvironmentVariables } from '../../../app/config'

/**
 * Service responsible for sending emails.
 */
@Injectable()
export class EmailService {
  // Logger instance for recording service operations.
  private readonly logger: Logger = new Logger(EmailService.name)

  /**
   * Initializes the EmailService.
   *
   * @param configService - Service to access environment variables.
   * @param mailerService Service for performing email operations.
   */
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Sends an email using the configured MailerService.
   *
   * @param options - An object containing:
   *   - `to`: Recipient email address.
   *   - `subject`: Subject line of the email.
   *   - `text`: Plain-text body of the email.
   *   - `html`: HTML body of the email.
   * @returns A promise that resolves when the email has been sent.
   */
  private async sendEmail(
    options: Pick<ISendMailOptions, 'to' | 'subject' | 'text' | 'html'>,
  ) {
    if (this.configService.get('EMAIL_ENABLED') === false) {
      this.logger.debug('Skip sending email, disabled.')
      return
    }
    try {
      await this.mailerService.sendMail({
        from: 'no-reply@klurigo.com',
        ...options,
      })
    } catch (error) {
      const { message, stack } = error as Error
      this.logger.error(`Failed to send email: '${message}'.`, stack)
    }
  }

  /**
   * Sends a welcome email containing a verification link to a new user.
   *
   * @param to               – Recipient’s email address.
   * @param verificationLink – Optional URL the user clicks to verify their email.
   * @returns A promise that resolves when the welcome email has been sent.
   */
  public async sendWelcomeEmail(
    to: string,
    verificationLink?: string,
  ): Promise<void> {
    this.logger.log(`Sending welcome email to ${to}.`)

    const text = verificationLink
      ? `Hi,

Thank you for signing up for Klurigo. We’re thrilled to have you on board!

Please verify your email address by clicking or copying the link below into your browser:
${verificationLink}

This link will expire in 3 days. If you didn’t create this account, simply ignore this email.

Cheers,
The Klurigo Team`
      : `Hi,

Thank you for signing up for Klurigo. We’re thrilled to have you on board!

Cheers,
The Klurigo Team`

    const html = verificationLink
      ? `<p>Hi,</p>

<p>Thank you for signing up for Klurigo. We’re thrilled to have you on board!</p>

<p>Please verify your email address by clicking or copying the link below into your browser:</p>
<a href="${verificationLink}">${verificationLink}</a>

<p>This link will expire in 3 days. If you didn’t create this account, simply ignore this email.</p>

<p>Cheers,<br />The Klurigo Team</p>`
      : `<p>Hi,</p>

<p>Thank you for signing up for Klurigo. We’re thrilled to have you on board!</p>

<p>Cheers,<br />The Klurigo Team</p>`

    await this.sendEmail({
      to,
      subject: 'Welcome to Klurigo!',
      text,
      html,
    })
  }

  /**
   * Sends a verification email containing a verification link to an existing user.
   *
   * @param to               – Recipient’s email address.
   * @param verificationLink – URL the user clicks to verify their email.
   * @returns A promise that resolves when the verification email has been sent.
   */
  public async sendVerificationEmail(
    to: string,
    verificationLink: string,
  ): Promise<void> {
    this.logger.log(`Sending verification email to ${to}.`)

    const text = `Hi,

We received a request to change the email address on your Klurigo account. To complete this update, please verify your new email by clicking or copying the link below into your browser:
${verificationLink}

This link will expire in 3 days. If you did not request an email change, you can safely ignore this message and no changes will be made.

Thanks for helping us keep your account secure!

Cheers,
The Klurigo Team`

    const html = `<p>Hi,</p>

<p>We received a request to change the email address on your Klurigo account. To complete this update, please verify your new email by clicking or copying the link below into your browser:</p>
<a href="${verificationLink}">${verificationLink}</a>

<p>This link will expire in 3 days. If you did not request an email change, you can safely ignore this message and no changes will be made.</p>

<p>Thanks for helping us keep your account secure!</p>

<p>Cheers,<br />The Klurigo Team</p>`

    await this.sendEmail({
      to,
      subject: 'Confirm Your New Email Address for Klurigo',
      text,
      html,
    })
  }

  /**
   * Sends a password reset email to the specified recipient.
   *
   * @param to – The recipient’s email address.
   * @param passwordResetLink – The URL containing the password reset token.
   * @returns A promise that resolves when the email has been sent.
   */
  public async sendPasswordResetEmail(
    to: string,
    passwordResetLink: string,
  ): Promise<void> {
    this.logger.log(`Sending password reset email to ${to}.`)

    const text = `Hi,

We received a request to reset the password for your Klurigo account. To choose a new password, please click or copy the link below into your browser:
${passwordResetLink}

This link will expire in 60 minutes. If you did not request a password reset, no changes will be made to your account.

Stay safe,
The Klurigo Team`

    const html = `<p>Hi,</p>

<p>We received a request to reset the password for your Klurigo account. To choose a new password, please click or copy the link below into your browser:<p/>
<a href="${passwordResetLink}">${passwordResetLink}</a>

<p>This link will expire in 60 minutes. If you did not request a password reset, no changes will be made to your account.</p>

<p>Stay safe,<br />The Klurigo Team</p>`

    await this.sendEmail({
      to,
      subject: 'Reset Your Klurigo Password',
      text,
      html,
    })
  }
}
