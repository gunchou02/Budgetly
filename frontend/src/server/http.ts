import { Prisma } from '@/generated/prisma/client';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
    public readonly code?: string,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
  }
}

export function dataResponse<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function messageResponse(message: string, status = 200): Response {
  return Response.json({ message }, { status });
}

function zodErrors(error: ZodError): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const key = issue.path[0]?.toString() ?? 'request';
    result[key] ??= [];
    result[key].push(issue.message);
    return result;
  }, {});
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
        ...(error.code ? { error: { code: error.code } } : {}),
      },
      { headers: error.headers, status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        message: '入力内容を確認してください。',
        errors: zodErrors(error),
      },
      { status: 422 },
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return Response.json(
      {
        message: '同じ内容のデータがすでに登録されています。',
        errors: {
          request: ['同じ内容のデータがすでに登録されています。'],
        },
      },
      { status: 422 },
    );
  }

  console.error(error);

  return Response.json(
    { message: 'サーバーでエラーが発生しました。' },
    { status: 500 },
  );
}

export function apiHandler<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
