import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Prisma, User } from '@/generated/prisma/client';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '@/server/config';
import { getDb } from '@/server/db';
import { deleteGuestAccount } from '@/server/guest';
import { ApiError } from '@/server/http';

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

type SessionWriter = Pick<Prisma.TransactionClient, 'session'>;

export interface NewSession {
  expiresAt: Date;
  token: string;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.isGuest ? null : user.email,
    is_guest: user.isGuest,
    guest_expires_at: user.guestExpiresAt?.toISOString() ?? null,
  };
}

export async function createSessionRecord(
  userId: number,
  db: SessionWriter = getDb(),
  expiresAt: Date = sessionExpiresAt(),
): Promise<NewSession> {
  const token = randomBytes(32).toString('base64url');

  await db.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  return { expiresAt, token };
}

export async function setSessionCookie(session: NewSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: session.expiresAt,
  });
}

export async function createSession(userId: number): Promise<void> {
  const session = await createSessionRecord(userId);
  await setSessionCookie(session);
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return;
  }

  const session = await getDb().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (session?.user.isGuest) {
    await deleteGuestAccount(session.user.id);
  } else {
    await getDb().session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await getDb().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  const now = new Date();
  const guestExpired =
    session?.user.isGuest &&
    (!session.user.guestExpiresAt || session.user.guestExpiresAt <= now);

  if (!session || session.expiresAt <= now || guestExpired) {
    if (session) {
      if (session.user.isGuest) {
        await deleteGuestAccount(session.user.id);
      } else {
        await getDb().session.delete({ where: { id: session.id } });
      }
    }
    return null;
  }

  return session.user;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();

  if (!user) {
    throw new ApiError(401, 'Unauthenticated.');
  }

  return user;
}

export async function requireMember(): Promise<User> {
  const user = await requireUser();

  if (user.isGuest) {
    throw new ApiError(
      403,
      'この機能はアカウント登録後に利用できます。',
      undefined,
      'member_account_required',
    );
  }

  return user;
}
