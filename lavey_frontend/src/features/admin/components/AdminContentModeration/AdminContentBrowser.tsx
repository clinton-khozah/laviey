import { useCallback, useEffect, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { adminModerationService, type AdminPostItem } from '@/services/admin/adminModerationService';
import { adminService } from '@/services/admin/adminService';
import type { AdminUserRecord } from '@/types/admin.types';
import './AdminContentBrowser.css';

type BrowserTab = 'posts' | 'profiles';

const PROFILE_PAGE_SIZE = 24;

type DeleteDialog =
  | { step: 'confirm'; title: string; message: string; detail: string; confirmLabel: string; run: () => Promise<string> }
  | { step: 'success' | 'error'; title: string; message: string };

export function AdminContentBrowser() {
  const [tab, setTab] = useState<BrowserTab>('posts');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [profiles, setProfiles] = useState<AdminUserRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DeleteDialog | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'posts') {
        const items = await adminModerationService.listPosts(debouncedSearch || undefined);
        setPosts(items);
        setTotal(items.length);
        setTotalPages(1);
      } else {
        const result = await adminService.listUsers({
          view: 'all',
          page,
          limit: PROFILE_PAGE_SIZE,
          search: debouncedSearch || undefined,
        });
        setProfiles(result.users);
        setTotal(result.pagination.total);
        setTotalPages(Math.max(1, result.pagination.totalPages));
      }
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Could not load content.', error: true });
    } finally {
      setLoading(false);
    }
  }, [tab, page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const requestDeletePost = (post: AdminPostItem) =>
    setDialog({
      step: 'confirm',
      title: 'Delete this post?',
      message: `The post by ${post.userHandle} will be permanently removed.`,
      detail: 'The media, likes and comments are erased from the app and cannot be restored.',
      confirmLabel: 'Delete post',
      run: async () => {
        await adminModerationService.deletePost(post.id);
        setPosts((current) => current.filter((item) => item.id !== post.id));
        setTotal((count) => Math.max(0, count - 1));
        return `The post by ${post.userHandle} was deleted successfully.`;
      },
    });

  const requestDeleteProfile = (profile: AdminUserRecord) =>
    setDialog({
      step: 'confirm',
      title: 'Delete this profile?',
      message: `${profile.name} (${profile.handle}) will be permanently removed.`,
      detail: 'Their account, profile, photos, posts and chats are erased from the app and cannot be restored.',
      confirmLabel: 'Delete profile',
      run: async () => {
        await adminService.deleteUser(profile.id);
        setProfiles((current) => current.filter((item) => item.id !== profile.id));
        setTotal((count) => Math.max(0, count - 1));
        return `${profile.name} was deleted successfully.`;
      },
    });

  const confirmDialog = async () => {
    if (!dialog || dialog.step !== 'confirm') return;
    const { run } = dialog;
    setDialogBusy(true);
    try {
      const text = await run();
      setDialog({ step: 'success', title: 'Deleted successfully', message: text });
    } catch (err) {
      setDialog({
        step: 'error',
        title: 'Could not delete',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setDialogBusy(false);
    }
  };

  const closeDialog = () => {
    if (!dialogBusy) setDialog(null);
  };
  return (
    <article className="admin-content-moderation__card admin-content-moderation__card--wide admin-content-browser">
      <header className="admin-content-browser__head">
        <div>
          <h4>All Posts &amp; Profiles</h4>
          <p>Browse everything on the app and permanently delete anything that should not be there.</p>
        </div>
        <div className="admin-content-browser__tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'posts'} className={tab === 'posts' ? 'is-active' : ''} onClick={() => setTab('posts')}>
            Posts
          </button>
          <button type="button" role="tab" aria-selected={tab === 'profiles'} className={tab === 'profiles' ? 'is-active' : ''} onClick={() => setTab('profiles')}>
            Profiles
          </button>
        </div>
      </header>

      <input
        type="text"
        className="admin-content-browser__search"
        placeholder={tab === 'posts' ? 'Search by member, handle or caption...' : 'Search by name, handle or email...'}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {notice && (
        <p className={`admin-content-moderation__notice${notice.error ? ' admin-content-moderation__notice--error' : ''}`} role="status">
          {notice.text}
        </p>
      )}

      <p className="admin-content-moderation__empty">
        {loading ? 'Loading…' : `${total} ${tab === 'posts' ? 'post' : 'profile'}${total === 1 ? '' : 's'}`}
      </p>

      {tab === 'posts' ? (
        <div className="admin-content-moderation__queue-grid">
          {posts.map((post) => (
            <div key={post.id} className="admin-content-moderation__queue-card">
              <div className="admin-content-moderation__thumb">
                {post.type === 'video' ? (
                  <video src={post.src} poster={post.poster ?? undefined} controls preload="metadata" />
                ) : (
                  <img
                    src={post.src}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = APP_IMAGES.logo;
                    }}
                  />
                )}
                {!post.isVisible && <span>Hidden</span>}
              </div>
              <div className="admin-content-moderation__queue-body">
                <strong>
                  {post.userName} · {post.userHandle}
                </strong>
                <p>{post.caption || 'No caption'}</p>
                <small>{new Date(post.createdAt).toLocaleString()}</small>
                <div className="admin-content-moderation__queue-actions"><button type="button" className="is-danger" onClick={() => requestDeletePost(post)}>
                  Delete post
                </button></div>
              </div>
            </div>
          ))}
          {!loading && posts.length === 0 && <p className="admin-content-moderation__empty">No posts found.</p>}
        </div>
      ) : (
        <>
          <div className="admin-content-moderation__queue-grid">
            {profiles.map((profile) => (
              <div key={profile.id} className="admin-content-moderation__queue-card">
                <div className="admin-content-moderation__thumb">
                  <img
                    src={profile.avatarUrl || APP_IMAGES.logo}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = APP_IMAGES.logo;
                    }}
                  />
                  {profile.accountStatus !== 'active' && (
                    <span>{profile.accountStatus}</span>
                  )}
                </div>
                <div className="admin-content-moderation__queue-body">
                  <strong>
                    {profile.name} · {profile.handle}
                  </strong>
                  <p>{profile.bio || profile.email}</p>
                  <small>{profile.email}</small>
                  <div className="admin-content-moderation__queue-actions"><button type="button" className="is-danger" onClick={() => requestDeleteProfile(profile)}>
                    Delete profile
                  </button></div>
                </div>
              </div>
            ))}
            {!loading && profiles.length === 0 && <p className="admin-content-moderation__empty">No profiles found.</p>}
          </div>
          {totalPages > 1 && (
            <div className="admin-content-browser__pager">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
      {dialog && (
        <div className="admin-delete-modal" role="presentation" onClick={closeDialog}>
          <div
            className={`admin-delete-modal__panel is-${dialog.step}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="admin-delete-modal__icon" aria-hidden>
              {dialog.step === 'success' ? '✓' : dialog.step === 'error' ? '!' : '🗑'}
            </span>
            <h5 id="admin-delete-modal-title">{dialog.title}</h5>
            <p>{dialog.message}</p>
            {dialog.step === 'confirm' && <p className="admin-delete-modal__detail">{dialog.detail}</p>}
            <div className="admin-delete-modal__actions">
              {dialog.step === 'confirm' ? (
                <>
                  <button type="button" onClick={closeDialog} disabled={dialogBusy}>
                    Cancel
                  </button>
                  <button type="button" className="is-danger" onClick={() => void confirmDialog()} disabled={dialogBusy}>
                    {dialogBusy ? 'Deleting…' : dialog.confirmLabel}
                  </button>
                </>
              ) : (
                <button type="button" className="is-primary" onClick={closeDialog}>
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
