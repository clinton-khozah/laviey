import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiConfig } from '@/config/api.config';
import { getAdminSession } from '@/features/admin/session/adminSession';
import './AdminAiCompanions.css';
import './AdminAiCompanionsPolish.css';
import { ImageCropDialog } from './ImageCropDialog';

interface CompanionRow {
  id: string;
  profile_user_id: string;
  disclosure_label: string;
  personality_prompt: string;
  interests: string[];
  photo_urls: string[];
  reply_delay_min_seconds: number;
  reply_delay_max_seconds: number;
  is_active: boolean;
  auto_reply_enabled?: boolean;
  profiles?: { display_name?: string; avatar_url?: string; bio?: string; city?: string } | Array<{ display_name?: string; avatar_url?: string; bio?: string; city?: string }>;
}

interface Workspace {
  companion: CompanionRow;
  profile: Record<string, unknown>;
  posts: Array<{ id: string; public_url: string; caption: string }>;
  conversations: Array<{ id: string; last_message_preview: string; last_message_at: string; member?: { display_name?: string; avatar_url?: string } }>;
  requests: Array<{ id: string; request_kind: 'crush' | 'chat'; initial_message: string | null; created_at: string; member?: { display_name?: string; avatar_url?: string } }>;
}
interface Thread { conversationId: string; companionUserId: string; member?: { display_name?: string }; messages: Array<{ id: string; sender_user_id: string; body: string; created_at: string }> }
interface Track { spotifyId: string; title: string; artist: string; albumArtUrl: string | null; previewUrl: string | null }
interface QuizOption { key: string; label: string; emoji: string }
interface QuizQuestion { stepKey: string; kind: 'single' | 'multi' | 'input'; title: string; sortOrder: number; options: QuizOption[] }
type CropTask = { file: File; kind: 'profile' | 'draft-post' | 'workspace-post' };

const initialForm = {
  displayName: '', email: '', bio: '', headline: '', avatarUrl: '', photoUrls: '',
  dateOfBirth: '1998-01-01', gender: 'woman', city: '', country: 'South Africa',
  personalityPrompt: '', conversationGoals: 'Be warm\nAsk thoughtful follow-up questions\nRespect boundaries',
  interests: '', quizAnswers: '{\n  "purpose": "meaningful conversations",\n  "vibe": "chill"\n}',
  replyDelayMinSeconds: 20, replyDelayMaxSeconds: 90, isActive: true, autoReplyEnabled: true,
};

function lines(value: string): string[] {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminSession()?.token;
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  const body = await response.json() as { data?: T; message?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } };
  if (!response.ok) {
    const fieldMessage = Object.entries(body.details?.fieldErrors ?? {}).find(([, messages]) => messages?.[0]);
    const precise = fieldMessage ? `${fieldMessage[0]}: ${fieldMessage[1][0]}` : body.details?.formErrors?.[0];
    throw new Error(precise ?? body.message ?? 'Request failed');
  }
  return body.data as T;
}

function profileOf(row: CompanionRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

export function AdminAiCompanions() {
  const [rows, setRows] = useState<CompanionRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [manualReply, setManualReply] = useState('');
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [postCaption, setPostCaption] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizSelections, setQuizSelections] = useState<Record<string, string | string[]>>({});
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [draftPosts, setDraftPosts] = useState<File[]>([]);
  const [cropTasks, setCropTasks] = useState<CropTask[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await api<CompanionRow[]>('/admin/ai/companions')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load AI companions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void api<QuizQuestion[]>('/onboarding/questions').then((questions) => {
      const ordered = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
      setQuizQuestions(ordered);
      setQuizSelections((current) => {
        const next = { ...current };
        for (const question of ordered) {
          if (['interests', 'date_of_birth', 'gender'].includes(question.stepKey)) continue;
          next[question.stepKey] ??= question.kind === 'multi' ? [] : question.options[0]?.key ?? '';
        }
        return next;
      });
    }).catch((err) => setError(err instanceof Error ? err.message : 'Could not load onboarding options'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      if (selectedInterests.length < 3) throw new Error('Select at least 3 interests');
      const companion = await api<CompanionRow>('/admin/ai/companions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          email: form.email || undefined,
          avatarUrl: form.avatarUrl || undefined,
          photoUrls: lines(form.photoUrls),
          interests: selectedInterests,
          conversationGoals: lines(form.conversationGoals),
          quizAnswers: { ...quizSelections, interests: selectedInterests, gender: form.gender },
        }),
      });
      for (const file of draftPosts) await uploadPostFor(companion.id, file, '');
      setForm(initialForm);
      setSelectedInterests([]);
      setDraftPosts([]);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create AI companion'); }
    finally { setSaving(false); }
  }

  async function toggle(row: CompanionRow) {
    try {
      await api(`/admin/ai/companions/${row.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !row.is_active }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update AI companion'); }
  }

  async function uploadPhoto(file: File) {
    setUploading(true); setError('');
    try {
      const data = new FormData(); data.append('photo', file);
      const token = getAdminSession()?.token;
      const response = await fetch(`${apiConfig.baseUrl}/admin/ai/companions/photos`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data,
      });
      const body = await response.json() as { data?: { url?: string }; message?: string };
      if (!response.ok || !body.data?.url) throw new Error(body.message ?? 'Photo upload failed');
      setForm((current) => ({
        ...current,
        photoUrls: [...lines(current.photoUrls), body.data!.url!].slice(0, 6).join('\n'),
        avatarUrl: current.avatarUrl || body.data!.url!,
      }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Photo upload failed'); }
    finally { setUploading(false); }
  }

  async function uploadPostFor(companionId: string, file: File, caption: string) {
    const data = new FormData(); data.append('photo', file); data.append('caption', caption);
    const token = getAdminSession()?.token;
    const response = await fetch(`${apiConfig.baseUrl}/admin/ai/companions/${companionId}/posts`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: data });
    const body = await response.json() as { message?: string };
    if (!response.ok) throw new Error(body.message ?? 'Post upload failed');
  }

  async function openWorkspace(row: CompanionRow) {
    setError(''); setThread(null);
    try { setWorkspace(await api<Workspace>(`/admin/ai/companions/${row.id}/workspace`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not open companion'); }
  }
  async function refreshWorkspace() {
    if (!workspace) return;
    setWorkspace(await api<Workspace>(`/admin/ai/companions/${workspace.companion.id}/workspace`));
  }
  async function openConversation(conversationId: string) {
    if (!workspace) return;
    setThread(await api<Thread>(`/admin/ai/companions/${workspace.companion.id}/conversations/${conversationId}`));
  }
  async function respondToRequest(requestId: string, action: 'accept' | 'decline') {
    if (!workspace) return;
    setError('');
    try {
      await api(`/admin/ai/companions/${workspace.companion.id}/requests/${requestId}/respond`, { method: 'POST', body: JSON.stringify({ action }) });
      await refreshWorkspace();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update request'); }
  }
  async function sendManualReply() {
    if (!workspace || !thread || !manualReply.trim()) return;
    await api(`/admin/ai/companions/${workspace.companion.id}/conversations/${thread.conversationId}/messages`, { method: 'POST', body: JSON.stringify({ body: manualReply.trim() }) });
    setManualReply(''); await openConversation(thread.conversationId); await refreshWorkspace();
  }
  async function searchSpotify() {
    if (!spotifyQuery.trim()) return;
    setTracks(await api<Track[]>(`/admin/ai/companions/spotify/search?q=${encodeURIComponent(spotifyQuery.trim())}`));
  }
  async function setSong(song: Track | null) {
    if (!workspace) return;
    await api(`/admin/ai/companions/${workspace.companion.id}/theme-song`, { method: 'PUT', body: JSON.stringify({ song }) });
    await refreshWorkspace();
  }
  async function addPost(file: File) {
    if (!workspace) return;
    await uploadPostFor(workspace.companion.id, file, postCaption);
    setPostCaption(''); await refreshWorkspace();
  }
  function queueCrop(files: File[], kind: CropTask['kind'], limit: number) {
    setCropTasks((current) => [...current, ...files.slice(0, limit).map((file) => ({ file, kind }))]);
  }
  async function completeCrop(file: File) {
    const task = cropTasks[0];
    if (!task) return;
    if (task.kind === 'profile') await uploadPhoto(file);
    else if (task.kind === 'draft-post') setDraftPosts((current) => [...current, file].slice(0, 5));
    else await addPost(file);
    setCropTasks((current) => current.slice(1));
  }
  async function deletePost(postId: string) {
    if (!workspace) return;
    await api(`/admin/ai/companions/${workspace.companion.id}/posts/${postId}`, { method: 'DELETE' }); await refreshWorkspace();
  }
  async function deleteCompanion() {
    if (!workspace || !window.confirm('Permanently delete this AI companion, its posts, matches, and conversations?')) return;
    await api(`/admin/ai/companions/${workspace.companion.id}`, { method: 'DELETE' }); setWorkspace(null); await load();
  }

  return (
    <section className="admin-ai-companions">
      <header>
        <div><h3>AI companions</h3><p>Create disclosed virtual profiles with persona, onboarding data, photos, and controlled replies.</p></div>
        <span className="admin-ai-companions__disclosure">Always shown as AI</span>
      </header>
      {error ? <p className="admin-ai-companions__error">{error}</p> : null}
      <div className="admin-ai-companions__layout">
        <form onSubmit={submit} className="admin-ai-companions__form">
          <h4>Create AI companion</h4>
          <div className="admin-ai-companions__grid">
            <label>Name<input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
            <label>Internal email (optional)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Date of birth<input required type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
            <label>Gender<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="woman">Woman</option><option value="man">Man</option><option value="nonbinary">Nonbinary</option></select></label>
            <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
          </div>
          <label>Headline<input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
          <label>Bio<textarea required value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
          <label>Profile photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(e) => queueCrop(Array.from(e.target.files ?? []), 'profile', Math.max(0, 6 - lines(form.photoUrls).length))} /><small>{uploading ? 'Uploading…' : `${lines(form.photoUrls).length} of 6 uploaded. Each photo can be cropped before upload.`}</small></label>
          {lines(form.photoUrls).length ? <div className="admin-ai-companions__photo-preview">{lines(form.photoUrls).map((url) => <img src={url} key={url} alt="Uploaded profile" />)}</div> : null}
          <label>Profile posts<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => queueCrop(Array.from(e.target.files ?? []), 'draft-post', Math.max(0, 5 - draftPosts.length))} /><small>{draftPosts.length} of 5 cropped. These are uploaded as posts after creation.</small></label>
          <label>Interests <small>select at least 3 from the database</small><select required multiple size={8} value={selectedInterests} onChange={(e) => setSelectedInterests(Array.from(e.target.selectedOptions).map((option) => option.value))}>{quizQuestions.find((question) => question.stepKey === 'interests')?.options.map((option) => <option key={option.key} value={option.key}>{option.emoji} {option.label}</option>)}</select></label>
          {quizQuestions.filter((question) => !['interests', 'date_of_birth', 'gender'].includes(question.stepKey)).map((question) => question.kind === 'multi' ? <label key={question.stepKey}>{question.title}<select multiple size={Math.min(6, question.options.length)} value={Array.isArray(quizSelections[question.stepKey]) ? quizSelections[question.stepKey] as string[] : []} onChange={(e) => setQuizSelections({ ...quizSelections, [question.stepKey]: Array.from(e.target.selectedOptions).map((option) => option.value) })}>{question.options.map((option) => <option key={option.key} value={option.key}>{option.emoji} {option.label}</option>)}</select></label> : <label key={question.stepKey}>{question.title}<select required value={String(quizSelections[question.stepKey] ?? '')} onChange={(e) => setQuizSelections({ ...quizSelections, [question.stepKey]: e.target.value })}>{question.options.map((option) => <option key={option.key} value={option.key}>{option.emoji} {option.label}</option>)}</select></label>)}
          <label>Personality and speaking style<textarea required minLength={3} value={form.personalityPrompt} onChange={(e) => setForm({ ...form, personalityPrompt: e.target.value })} placeholder="Warm, curious, playful, concise..." /><small>A short value such as “warm” is allowed; adding detail improves replies.</small></label>
          <label>Conversation goals <small>one per line</small><textarea value={form.conversationGoals} onChange={(e) => setForm({ ...form, conversationGoals: e.target.value })} /></label>
          <div className="admin-ai-companions__grid">
            <label>Minimum reply delay<input type="number" min={5} max={90} value={form.replyDelayMinSeconds} onChange={(e) => setForm({ ...form, replyDelayMinSeconds: Number(e.target.value) })} /></label>
            <label>Maximum reply delay<input type="number" min={5} max={90} value={form.replyDelayMaxSeconds} onChange={(e) => setForm({ ...form, replyDelayMaxSeconds: Number(e.target.value) })} /></label>
          </div>
          <label className="admin-ai-companions__check"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active in discovery and chat</label>
          <label className="admin-ai-companions__check"><input type="checkbox" checked={form.autoReplyEnabled} onChange={(e) => setForm({ ...form, autoReplyEnabled: e.target.checked })} />AI auto-reply (turn off to respond manually from this dashboard)</label>
          <button disabled={saving}>{saving ? 'Creating…' : 'Create disclosed AI companion'}</button>
        </form>
        <div className="admin-ai-companions__list">
          <h4>Companions ({rows.length})</h4>
          {loading ? <p>Loading…</p> : rows.map((row) => {
            const profile = profileOf(row);
            return <article key={row.id}>
              <img src={profile?.avatar_url || row.photo_urls[0] || '/favicon.svg'} alt="" />
              <div><strong>{profile?.display_name || 'AI companion'}</strong><span>✦ {row.disclosure_label}</span><p>{profile?.bio}</p><small>{row.interests.join(' · ')} · replies in {row.reply_delay_min_seconds}–{row.reply_delay_max_seconds}s · {row.auto_reply_enabled === false ? 'manual replies' : 'AI auto-reply'}</small></div>
              <div className="admin-ai-companions__row-actions"><button type="button" className="admin-ai-companions__manage-btn" onClick={() => void openWorkspace(row)}>Manage</button><button type="button" className={`admin-ai-companions__status-btn ${row.is_active ? 'is-active' : 'is-paused'}`} onClick={() => void toggle(row)}><i aria-hidden />{row.is_active ? 'Active' : 'Paused'}</button></div>
            </article>;
          })}
        </div>
      </div>
      {workspace ? <div className="admin-ai-workspace__backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setWorkspace(null); }}>
        <section className="admin-ai-workspace" role="dialog" aria-modal="true">
          <header><div className="admin-ai-workspace__heading"><span className="admin-ai-workspace__mark">♥</span><div><h3>{String(workspace.profile.display_name ?? 'AI companion')}</h3><p><b>✦ AI companion</b> · Profile, posts, Spotify and conversations</p></div></div><button className="admin-ai-workspace__close" onClick={() => setWorkspace(null)} aria-label="Close">×</button></header>
          <div className="admin-ai-workspace__columns">
            <div className="admin-ai-workspace__panel">
              <h4>Profile</h4>
              <img className="admin-ai-workspace__avatar" src={String(workspace.profile.avatar_url ?? '')} alt="" />
              <label>Name<input defaultValue={String(workspace.profile.display_name ?? '')} onBlur={(e) => void api(`/admin/ai/companions/${workspace.companion.id}`, { method: 'PATCH', body: JSON.stringify({ displayName: e.target.value }) }).then(refreshWorkspace)} /></label>
              <label>Bio<textarea defaultValue={String(workspace.profile.bio ?? '')} onBlur={(e) => void api(`/admin/ai/companions/${workspace.companion.id}`, { method: 'PATCH', body: JSON.stringify({ bio: e.target.value }) }).then(refreshWorkspace)} /></label>
              <label>Headline<input defaultValue={String(workspace.profile.headline ?? '')} onBlur={(e) => void api(`/admin/ai/companions/${workspace.companion.id}`, { method: 'PATCH', body: JSON.stringify({ headline: e.target.value }) }).then(refreshWorkspace)} /></label>
              <label className="admin-ai-companions__check"><input type="checkbox" checked={workspace.companion.auto_reply_enabled !== false} onChange={(e) => void api(`/admin/ai/companions/${workspace.companion.id}`, { method: 'PATCH', body: JSON.stringify({ autoReplyEnabled: e.target.checked }) }).then(refreshWorkspace)} />AI auto-reply enabled</label>
              <p className="admin-ai-workspace__hint">When auto-reply is off, members still see the companion in chat but you reply manually below.</p>
              <button className="admin-ai-workspace__danger" onClick={() => void deleteCompanion()}>Delete AI companion</button>
            </div>
            <div className="admin-ai-workspace__panel">
              <h4>Profile posts</h4>
              <label>Caption<input value={postCaption} maxLength={120} onChange={(e) => setPostCaption(e.target.value)} /></label>
              <label className="admin-ai-workspace__upload">Add post<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => queueCrop(Array.from(e.target.files ?? []), 'workspace-post', 1)} /></label>
              <div className="admin-ai-workspace__posts">{workspace.posts.map((post) => <article key={post.id}><img src={post.public_url} alt="" /><span>{post.caption}</span><button onClick={() => void deletePost(post.id)}>Delete</button></article>)}</div>
              <h4>Spotify theme song</h4>
              {workspace.profile.theme_song_title ? <div className="admin-ai-workspace__song-current"><strong>{String(workspace.profile.theme_song_title)}</strong><span>{String(workspace.profile.theme_song_artist)}</span><button onClick={() => void setSong(null)}>Remove</button></div> : null}
              <div className="admin-ai-workspace__spotify-search"><input placeholder="Search Spotify" value={spotifyQuery} onChange={(e) => setSpotifyQuery(e.target.value)} /><button onClick={() => void searchSpotify()}>Search</button></div>
              <div className="admin-ai-workspace__tracks">{tracks.map((track) => <button key={track.spotifyId} onClick={() => void setSong(track)}>{track.albumArtUrl ? <img src={track.albumArtUrl} alt="" /> : null}<span><strong>{track.title}</strong><small>{track.artist}</small></span></button>)}</div>
            </div>
            <div className="admin-ai-workspace__panel admin-ai-workspace__chat">
              <div className="admin-ai-workspace__section-heading"><h4>Message requests</h4><span>{workspace.requests?.length ?? 0} pending</span></div>
              <div className="admin-ai-workspace__requests">
                {(workspace.requests ?? []).length ? workspace.requests.map((request) => <article key={request.id}>
                  {request.member?.avatar_url ? <img src={request.member.avatar_url} alt="" /> : <span className="admin-ai-workspace__request-avatar">{(request.member?.display_name ?? 'M').slice(0, 1)}</span>}
                  <div><strong>{request.member?.display_name ?? 'Member'}</strong><small>{request.request_kind === 'chat' ? 'Wants to message' : 'Sent a crushy'}</small>{request.initial_message ? <p>{request.initial_message}</p> : null}</div>
                  <div className="admin-ai-workspace__request-actions"><button onClick={() => void respondToRequest(request.id, 'accept')}>Accept</button><button onClick={() => void respondToRequest(request.id, 'decline')}>Decline</button></div>
                </article>) : <p className="admin-ai-workspace__empty">No pending requests.</p>}
              </div>
              <h4>Conversations</h4>
              <div className="admin-ai-workspace__conversation-list">{workspace.conversations.map((conversation) => <button key={conversation.id} onClick={() => void openConversation(conversation.id)}><strong>{conversation.member?.display_name ?? 'Member'}</strong><span>{conversation.last_message_preview || 'No messages yet'}</span></button>)}</div>
              {thread ? <><div className="admin-ai-workspace__messages">{thread.messages.map((message) => <p key={message.id} className={message.sender_user_id === thread.companionUserId ? 'is-ai' : 'is-member'}><small>{message.sender_user_id === thread.companionUserId ? 'AI companion' : thread.member?.display_name ?? 'Member'}</small>{message.body}</p>)}</div><div className="admin-ai-workspace__reply"><textarea placeholder="Reply as this disclosed AI companion" value={manualReply} onChange={(e) => setManualReply(e.target.value)} /><button onClick={() => void sendManualReply()}>Send reply</button></div></> : <p>Select a conversation to inspect it.</p>}
            </div>
          </div>
        </section>
      </div> : null}
      {cropTasks[0] ? <ImageCropDialog file={cropTasks[0].file} aspect={cropTasks[0].kind === 'profile' ? 1 : 4 / 5} title={cropTasks[0].kind === 'profile' ? 'Crop profile photo' : 'Crop post photo'} onCancel={() => setCropTasks((current) => current.slice(1))} onComplete={completeCrop} /> : null}
    </section>
  );
}
