import { getDb } from '@/server/db';
import { ApiError } from '@/server/http';

export async function requireOwnedCategory(
  userId: number,
  categoryId: number,
): Promise<void> {
  const category = await getDb().category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: { id: true },
  });

  if (!category) {
    throw new ApiError(422, '入力内容を確認してください。', {
      category_id: ['選択したカテゴリは使用できません。'],
    });
  }
}

export function notFound(): never {
  throw new ApiError(404, 'データが見つかりません。');
}
