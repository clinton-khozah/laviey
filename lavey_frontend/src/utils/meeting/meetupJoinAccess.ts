import type { OnlineDate } from '@/types';

/** Private meetups require entering the room code (or accepting an invite first). */
export function meetupRequiresAccessCode(date: OnlineDate): boolean {
  return date.visibility === 'private';
}
