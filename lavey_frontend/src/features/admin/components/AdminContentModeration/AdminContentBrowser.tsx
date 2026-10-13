import { useCallback, useEffect, useState } from 'react';
import { APP_IMAGES } from '@/constants/images';
import { adminModerationService, type AdminPostItem } from '@/services/admin/adminModerationService';
import { adminService } from '@/services/admin/adminService';
import type { AdminUserRecord } from '@/types/admin.types';
import './AdminContentBrowser.css';

type BrowserTab = 'posts' | 'profiles';

const PROFILE_PAGE_SIZE = 24;

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
  const [busyId, setBusyId] = useState<string | null>(null);
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

  const deletePost = async (post: AdminPostItem) => {
    const ok = window.confirm(
      `Permanently delete this post by ${post.userHandle}?\n\nThe media, likes and comments are erased from the app and cannot be restored.`,
    );
    if (!ok) return;
    setBusyId(post.id);
    try {
      await adminModerationService.deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setTotal((count) => Math.max(0, count - 1));
      setNotice({ text: `Post by ${post.userHandle} deleted.`, error: false });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Could not delete post.', error: true });
    } finally {
      setBusyId(null);
    }
  };

  const deleteProfile = async (profile: AdminUserRecord) => {
    const ok = window.confirm(
      `Permanently delete ${profile.name} (${profile.handle})?\n\nTheir account, profile, photos, posts and chats are erased from the app and cannot be restored.`,
    );
    if (!ok) return;
    setBusyId(profile.id);
    try {
      await adminService.deleteUser(profile.id);
      setProfiles((current) => current.filter((item) => item.id !== profile.id));
      setTotal((count) => Math.max(0, count - 1));
      setNotice({ text: `${profile.name} deleted.`, error: false });
    } catch (err) {
      setNotice({ text: err instanceof Error ? err.message : 'Could not delete profile.', error: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <article className="admin-content-browser">
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
        <p className={`admin-content-browser__notice${notice.error ? ' is-error' : ''}`} role="status">
          {notice.text}
        </p>
      )}

      <p className="admin-content-browser__count">
        {loading ? 'Loading…' : `${total} ${tab === 'posts' ? 'post' : 'profile'}${total === 1 ? '' : 's'}`}
      </p>

      {tab === 'posts' ? (
        <div className="admin-content-browser__grid">
          {posts.map((post) => (
            <div key={post.id} className="admin-content-browser__card">
              <div className="admin-content-browser__media">
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
                {!post.isVisible && <span className="admin-content-browser__badge">Hidden</span>}
              </div>
              <div className="admin-content-browser__body">
                <strong>
                  {post.userName} · {post.userHandle}
                </strong>
                <p>{post.caption || 'No caption'}</p>
                <small>{new Date(post.createdAt).toLocaleString()}</small>
                <button type="button" className="is-danger" disabled={busyId === post.id} onClick={() => void deletePost(post)}>
                  {busyId === post.id ? 'Deleting…' : 'Delete post'}
                </button>
              </div>
            </div>
          ))}
          {!loading && posts.length === 0 && <p className="admin-content-browser__empty">No posts found.</p>}
        </div>
      ) : (
        <>
          <div className="admin-content-browser__grid">
            {profiles.map((profile) => (
              <div key={profile.id} className="admin-content-browser__card">
                <div className="admin-content-browser__media">
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
                    <span className="admin-content-browser__badge">{profile.accountStatus}</span>
                  )}
                </div>
                <div className="admin-content-browser__body">
                  <strong>
                    {profile.name} · {profile.handle}
                  </strong>
                  <p>{profile.bio || profile.email}</p>
                  <small>{profile.email}</small>
                  <button type="button" className="is-danger" disabled={busyId === profile.id} onClick={() => void deleteProfile(profile)}>
                    {busyId === profile.id ? 'Deleting…' : 'Delete profile'}
                  </button>
                </div>
              </div>
            ))}
            {!loading && profiles.length === 0 && <p className="admin-content-browser__empty">No profiles found.</p>}
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
    </article>
  );
}
