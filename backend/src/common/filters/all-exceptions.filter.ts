import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Shapes every error leaving the API.
 *
 * Validation messages (an array of strings) are forwarded because the client
 * needs them to render field errors. Any other HttpException response — a
 * string, an object, or a bypassed error body — is collapsed to a generic
 * message so internal details never reach the client. Non-HTTP errors are
 * always reported as 500 with no stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      this.logError(request, status, exception);

      response
        .status(status)
        .json({
          statusCode: status,
          message: this.publicMessage(body),
          timestamp: new Date().toISOString(),
        });
      return;
    }

    this.logError(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }

  private publicMessage(body: unknown): unknown {
    // ValidationPipe emits string[]. Everything else is treated as internal
    // detail and replaced with a generic message.
    if (Array.isArray(body)) {
      return body.filter((entry) => typeof entry === 'string');
    }
    if (typeof body === 'string') {
      return body;
    }
    if (typeof body === 'object' && body !== null) {
      const record = body as Record<string, unknown>;
      if (Array.isArray(record.message)) {
        return (record.message as unknown[]).filter(
          (entry) => typeof entry === 'string',
        );
      }
    }
    return 'Request failed';
  }

  /**
   * Logs the path without the query string: return/callback URLs for payment
   * providers carry an unverified parameter set, including transaction ids.
   */
  private logError(request: Request, status: number, exception: unknown) {
    const path = request.path ?? request.url ?? '';
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`${request.method} ${path} -> ${status}`, stack);
  }
}
