-- Message emoji reactions (heart, etc.) on chat_messages
-- Run after 011_chat_messaging.sql

alter table public.chat_messages
  add column if not exists reaction text
  check (reaction is null or (char_length(reaction) >= 1 and char_length(reaction) <= 16));

comment on column public.chat_messages.reaction is 'Optional emoji reaction on a message (any participant in the thread).';

drop policy if exists "Chat messages updatable by members" on public.chat_messages;
create policy "Chat messages updatable by members"
  on public.chat_messages for update
  to authenticated
  using (public.user_in_conversation(conversation_id))
  with check (public.user_in_conversation(conversation_id));

insert into public.api_routes (method, path_pattern, handler_key, description)
values (
  'PATCH',
  '/messages/conversations/:conversationId/messages/:messageId',
  'messages.setMessageReaction',
  'Set or clear emoji reaction on a chat message'
)
on conflict (method, path_pattern) do update set
  handler_key = excluded.handler_key,
  description = excluded.description,
  is_active = true;

notify pgrst, 'reload schema';
