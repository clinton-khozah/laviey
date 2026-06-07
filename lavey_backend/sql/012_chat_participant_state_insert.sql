-- Fix: participant rows for new conversations (trigger runs as definer; belt-and-suspenders for RLS)
-- Run after 011_chat_messaging.sql if chat still fails after backend uses service role for inserts.

drop policy if exists "Chat participant state insertable by conversation members" on public.chat_participant_state;
create policy "Chat participant state insertable by conversation members"
  on public.chat_participant_state for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.user_in_conversation(conversation_id)
  );

notify pgrst, 'reload schema';
