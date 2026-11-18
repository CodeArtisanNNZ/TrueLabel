import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus ? exception.getStatus() : 500;

    const acceptsHtml = request.accepts ? request.accepts(['html', 'json']) === 'html' : false;

    if (acceptsHtml) {
      if (status === 401) {
        return response.redirect('/auth/login?unauthorized=true');
      }

      if (status === 403) {
        return response.status(403).render('shared/views/forbidden', {
          title: 'Access Forbidden — TrueLabel',
          message: exception.message || 'You do not have permission to access this resource.',
          user: request.session?.user || null,
        });
      }

      if (status === 404 || status === 400) {
        let errMessage = exception.message || 'The requested resource could not be found.';
        const exceptionResponse = exception.getResponse ? exception.getResponse() : null;
        if (exceptionResponse && typeof exceptionResponse === 'object') {
          const respObj = exceptionResponse as any;
          if (Array.isArray(respObj.message)) {
            errMessage = respObj.message.join('. ');
          } else if (typeof respObj.message === 'string') {
            errMessage = respObj.message;
          }
        }

        return response.status(status).render('shared/views/not-found', {
          title: status === 404 ? 'Page Not Found — TrueLabel' : 'Invalid Request — TrueLabel',
          statusCode: status,
          message: errMessage,
          path: request.url,
          user: request.session?.user || null,
        });
      }
    }

    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
    };

    return response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: errorNames[status] || 'Error',
    });
  }
}
