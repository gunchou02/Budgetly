import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { ensureDefaultCategories } from '@/server/default-categories';
import { apiHandler, dataResponse } from '@/server/http';
import { serializeCategory } from '@/server/serializers';
import {
  categoryCreateSchema,
  jsonBody,
  searchParams,
} from '@/server/validation';

const categoryFilterSchema = z.object({
  type: z.enum(['expense', 'fixed']).optional(),
});

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = categoryFilterSchema.parse(searchParams(request));

  await ensureDefaultCategories(user.id);

  const categories = await getDb().category.findMany({
    where: {
      userId: user.id,
      ...(filter.type ? { type: filter.type } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return dataResponse(categories.map(serializeCategory));
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const input = categoryCreateSchema.parse(await jsonBody(request));

  const category = await getDb().$transaction(async (transaction) => {
    const aggregate = await transaction.category.aggregate({
      where: { userId: user.id, type: input.type },
      _max: { sortOrder: true },
    });

    return transaction.category.create({
      data: {
        userId: user.id,
        name: input.name,
        type: input.type,
        color: input.type === 'fixed' ? '#DB2777' : '#71717A',
        icon: input.type === 'fixed' ? 'repeat' : 'more-horizontal',
        sortOrder: (aggregate._max.sortOrder ?? 0) + 1,
        isDefault: false,
      },
    });
  });

  return dataResponse(serializeCategory(category), 201);
});
