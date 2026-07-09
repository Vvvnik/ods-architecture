import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { AppError } from '../../domain/errors.js';

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (
      error: FastifyError | Error,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => void | Promise<void>,
  ) => void;
}): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send(error.toJSON());
      return;
    }

    if (error instanceof ZodError) {
      void reply.status(400).send({
        code: 'validation_error',
        message: 'Ошибка валидации запроса',
      });
      return;
    }

    const statusCode =
      'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    if (statusCode === 404) {
      void reply.status(404).send({
        code: 'not_found',
        message: 'Ресурс не найден',
      });
      return;
    }

    if (statusCode === 405) {
      void reply.status(400).send({
        code: 'validation_error',
        message: 'Некорректный путь запроса (проверьте projectId)',
      });
      return;
    }

    void reply.status(statusCode).send({
      code: 'internal_error',
      message: 'Внутренняя ошибка сервера',
    });
  });
}
