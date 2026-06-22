import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileInterestItem, ProfilePost } from "@/types";
import { ProfileInterestPicker } from "@/components/profile/ProfileInterestPicker";
import { onboardingService } from "@/services/onboarding/onboardingService";
import { defaultAvatar } from "@/constants/defaultAvatar";
import { APP_IMAGES } from "@/constants/images";
import {
  MAX_PROFILE_INTERESTS,
  PROFILE_INTERESTS_LIMIT_MESSAGE,
} from "@/constants/profileInterests";
import {
  MAX_PROFILE_POSTS,
  POST_LIMIT_MESSAGE,
} from "@/constants/profilePosts";
import { FeedState } from "@/components/ui/FeedState";
import { PageTransitionSplash } from "@/components/ui/PageTransitionSplash/PageTransitionSplash";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { ProfileLikesPanel } from "@/components/profile/ProfileLikesPanel";
import {
  ProfileMenuSheet,
  type ProfileMenuAction,
} from "@/components/profile/ProfileMenuSheet";
import { ProfilePostViewer } from "@/components/profile/ProfilePostViewer";
import { ProfilePostsGrid } from "@/components/profile/ProfilePostsGrid";
import { GiftEarningsSheet } from "@/components/profile/GiftEarningsSheet";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { PlatinumUpgradeSheet } from "@/components/subscription/PlatinumUpgradeSheet";
import { SettingsSheet } from "@/components/profile/SettingsSheet";
import { BlockedUsersSheet } from "@/components/profile/BlockedUsersSheet";
import { SafetyPrivacySheet } from "@/components/profile/SafetyPrivacySheet";
import { privacyService } from "@/services/privacy/privacyService";
import { SignOutConfirmSheet } from "@/components/profile/SignOutConfirmSheet";
import { SupportChatSheet } from "@/components/profile/SupportChatSheet";
import { TrustInfoSheet } from "@/components/profile/TrustInfoSheet";
import { SheetSaveSuccess } from "@/components/profile/SheetSaveSuccess";
import { VerifyIdentitySheet } from "@/components/profile/VerifyIdentitySheet";
import { userProfileService } from "@/services/users/userProfileService";
import { contentService } from "@/services/content/contentService";
import { prepareImageForUpload } from "@/utils/media/prepareUploadMedia";
import { nsfwImageUserMessage } from "@/utils/media/nsfwImageCheck";
import {
  useAuth,
  useMatchActions,
  useProfilesWhoLikedYou,
  useUserProfile,
} from "@/hooks";
import { openChatWithProfile } from "@/utils/navigation/appNav";
import { setProfileVerified } from "@/utils/profile/verificationStorage";
import { resolveProfilePhotoReferenceUrl } from "@/utils/profile/profilePhotoReference";
import { setStoredProfileAvatar } from "@/utils/profile/profileAvatarStorage";
import {
  getUserFacingErrorMessage,
  SESSION_EXPIRED_MESSAGE,
} from "@/utils/errors/userFacingErrorMessage";
import "./ProfilePage.css";

type ProfileTab = "posts" | "likes";
type SheetSavePhase = "idle" | "saving" | "success";

type ProfileSheetId =
  | "edit"
  | "earnings"
  | "photos"
  | "platinum"
  | "safety"
  | "blockedUsers"
  | "settings"
  | "verify"
  | "signout"
  | "deleteAccount"
  | "support"
  | "guidelines"
  | "terms"
  | null;

export function ProfilePage() {
  const { signOut, isSubmitting } = useAuth();
  const { profile, isLoading, error, refetch } = useUserProfile();
  const { likedIds, sendFlame } = useMatchActions();
  const {
    profiles: receivedLikers,
    count: receivedLikeCount,
    isLoading: likersLoading,
    refetch: refetchLikers,
  } = useProfilesWhoLikedYou();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [sheet, setSheet] = useState<ProfileSheetId>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [profilePosts, setProfilePosts] = useState<ProfilePost[] | null>(null);
  const [verified, setVerified] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(
    null,
  );
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInterestKeys, setEditInterestKeys] = useState<string[]>([]);
  const [interestOptions, setInterestOptions] = useState<ProfileInterestItem[]>(
    [],
  );
  const [editSavePhase, setEditSavePhase] = useState<SheetSavePhase>("idle");
  const [photoSavePhase, setPhotoSavePhase] = useState<SheetSavePhase>("idle");
  const [editError, setEditError] = useState<string | null>(null);

  const clearPendingPhoto = useCallback(() => {
    setPendingPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPendingPhotoFile(null);
  }, []);

  useEffect(() => {
    if (sheet === "edit") setEditSavePhase("idle");
    if (sheet === "photos") {
      setPhotoSavePhase("idle");
      setPhotoUploadError(null);
      clearPendingPhoto();
    }
  }, [sheet, clearPendingPhoto]);

  useEffect(() => {
    if (profile) setVerified(profile.verified);
  }, [profile?.verified, profile?.id]);

  useEffect(() => {
    if (profile?.posts) setProfilePosts(profile.posts);
  }, [profile?.id, profile?.posts]);

  const displayPosts = profilePosts ?? profile?.posts ?? [];
  const photoCount = displayPosts.length;
  const atPostLimit = photoCount >= MAX_PROFILE_POSTS;

  const removePostFromGrid = (postId: string) => {
    setProfilePosts((prev) => {
      const list = prev ?? profile?.posts ?? [];
      return list.filter((p) => p.id !== postId);
    });
    if (viewingPostId === postId) setViewingPostId(null);
  };

  const handleDeletePost = async (postId: string) => {
    const previous = profilePosts ?? profile?.posts ?? [];
    removePostFromGrid(postId);
    try {
      await contentService.deletePost(postId);
      await refetch();
    } catch (err) {
      setProfilePosts(previous);
      throw err;
    }
  };

  const handleHidePost = async (postId: string) => {
    removePostFromGrid(postId);
    await refetch();
  };

  const avatarSrc = avatarOverride ?? profile?.avatarUrl ?? defaultAvatar;
  const profilePhotoReference = resolveProfilePhotoReferenceUrl(profile?.id, avatarSrc);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile || !file.type.startsWith("image/")) return;

    void (async () => {
      setAvatarUploadError(null);
      setIsUploadingAvatar(true);
      try {
        const prepared = await prepareImageForUpload(file, undefined, {
          avatarUpload: true,
        });
        const avatarUrl = await contentService.uploadAvatar(prepared);
        setStoredProfileAvatar(profile.id, avatarUrl);
        setAvatarOverride(avatarUrl);
        await refetch();
      } catch (err) {
        setAvatarUploadError(nsfwImageUserMessage(err));
      } finally {
        setIsUploadingAvatar(false);
      }
    })();
  };

  const openPhotoPicker = () => {
    if (isUploadingPhoto || atPostLimit) return;
    const input = photoInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        input.click();
      }
      return;
    }
    input.click();
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoUploadError(null);
    if (atPostLimit) {
      setPhotoUploadError(POST_LIMIT_MESSAGE);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("Please choose a photo (images only).");
      return;
    }

    clearPendingPhoto();
    setPendingPhotoFile(file);
    setPendingPhotoPreview(URL.createObjectURL(file));
  };

  const handleConfirmPhotoUpload = () => {
    if (!pendingPhotoFile || isUploadingPhoto || atPostLimit) return;

    void (async () => {
      setPhotoUploadError(null);
      setIsUploadingPhoto(true);
      try {
        const prepared = await prepareImageForUpload(
          pendingPhotoFile,
          undefined,
          { galleryUpload: true },
        );
        const created = await contentService.createPost({ file: prepared });
        setProfilePosts((prev) => [created, ...(prev ?? profile?.posts ?? [])]);
        await refetch();
        clearPendingPhoto();
        setPhotoSavePhase("success");
      } catch (err) {
        setPhotoUploadError(nsfwImageUserMessage(err));
      } finally {
        setIsUploadingPhoto(false);
      }
    })();
  };

  const closeSheet = () => setSheet(null);

  const completeVerification = () => {
    if (!profile) return;
    setProfileVerified(profile.id, true);
    setVerified(true);
    void refetch();
  };

  const openMenuAction = (action: ProfileMenuAction) => {
    if (action === "edit" && profile) {
      setEditDisplayName(profile.displayName);
      setEditBio(profile.bio);
      setEditInterestKeys(profile.interests.map((item) => item.key));
      setEditError(null);
      void onboardingService.listInterestOptions().then(setInterestOptions);
    }
    setSheet(action);
  };

  const handleSaveProfile = async () => {
    const displayName = editDisplayName.trim();
    if (!displayName) {
      setEditError("Display name is required.");
      return;
    }

    if (editInterestKeys.length < 1) {
      setEditError("Pick at least one interest from your quiz.");
      return;
    }

    if (editInterestKeys.length > MAX_PROFILE_INTERESTS) {
      setEditError(PROFILE_INTERESTS_LIMIT_MESSAGE);
      return;
    }

    setEditSavePhase("saving");
    setEditError(null);
    try {
      await userProfileService.updateMyProfile({
        displayName,
        bio: editBio.trim(),
        interestKeys: editInterestKeys,
      });
      await refetch();
      setEditSavePhase("success");
    } catch (err) {
      setEditError(getUserFacingErrorMessage(err, "Could not save profile."));
      setEditSavePhase("idle");
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSignOut = () => {
    closeSheet();
    void signOut();
  };

  const handleDeleteAccount = () => {
    setDeleteError(null);
    setIsDeleting(true);
    void privacyService
      .deleteAccount()
      .then(() => {
        closeSheet();
        return signOut();
      })
      .catch((err: unknown) => {
        setDeleteError(
          err instanceof Error ? err.message : "Could not delete account.",
        );
      })
      .finally(() => setIsDeleting(false));
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  return (
    <div className="profile-page">
      <div className="profile-page__bg" aria-hidden>
        <div className="profile-page__bg-glow" />
        <img src={APP_IMAGES.logo} alt="" className="profile-page__bg-logo" />
      </div>
      {!profile && isLoading && <PageTransitionSplash />}
      {!profile && error && (
        <div className="profile-page__fallback">
          <FeedState
            message={error}
            onRetry={() =>
              error === SESSION_EXPIRED_MESSAGE
                ? void signOut()
                : void refetch()
            }
            retryLabel={
              error === SESSION_EXPIRED_MESSAGE ? "Sign in again" : "Try again"
            }
          />
        </div>
      )}

      {profile && (
        <div className="profile-page__content">
          {!profile.isPremium ? (
            <button
              type="button"
              className="profile-page__upgrade"
              onClick={() => setSheet("platinum")}
              aria-label="Upgrade to Platinum"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
                className="profile-page__upgrade-crown"
              >
                <path d="M5 16 3 8l5.2 3.3L12 4l3.8 7.3L21 8l-2 8H5zm-1 2h18v2H4v-2z" />
              </svg>
              Upgrade
            </button>
          ) : null}
          <button
            ref={menuTriggerRef}
            type="button"
            className="profile-page__menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open profile menu"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
            </svg>
          </button>

          <div className="profile-page__header">
            <div className="profile-page__hero">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="profile-page__avatar-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleAvatarFile}
              />
              <div className="profile-page__avatar-wrap">
                <button
                  type="button"
                  className="profile-page__avatar-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Edit profile photo"
                >
                  <span
                    className="profile-page__avatar"
                    style={{ backgroundImage: `url("${avatarSrc}")` }}
                    role="img"
                    aria-label={profile.displayName}
                  />
                  {isUploadingAvatar ? (
                    <span className="profile-page__avatar-loading" aria-hidden>
                      <LogoLoader size="sm" label="Uploading photo" />
                    </span>
                  ) : null}
                  <span className="profile-page__edit-badge">Edit</span>
                  {verified && (
                    <VerifiedBadge
                      size="lg"
                      ring
                      className="profile-page__avatar-verified"
                      title="Verified identity"
                    />
                  )}
                </button>
                {!verified && (
                  <button
                    type="button"
                    className="profile-page__verify-status"
                    onClick={() => setSheet("verify")}
                    aria-label="Unverified — verify your identity"
                  >
                    <span className="profile-page__avatar-verify-btn">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    </span>
                    <span className="profile-page__unverified-label">
                      Unverified
                    </span>
                  </button>
                )}
              </div>
              {avatarUploadError ? (
                <p
                  className="profile-sheet__edit-error profile-page__avatar-error"
                  role="alert"
                >
                  {avatarUploadError}
                </p>
              ) : null}
              <h2 className="profile-page__name">{profile.displayName}</h2>
              {profile.isPremium ? (
                <span className="profile-page__premium">Platinum member</span>
              ) : null}
              <p className="profile-page__bio">{profile.bio}</p>
              <div className="profile-page__interests" aria-label="Interests">
                <div className="profile-page__interests-row">
                  {profile.interests.map((item) => (
                    <span
                      key={item.key}
                      className="profile-page__tag"
                      data-interest={item.key}
                    >
                      {item.emoji && (
                        <span className="profile-page__tag-emoji" aria-hidden>
                          {item.emoji}
                        </span>
                      )}
                      <span className="profile-page__tag-label">
                        #{item.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="profile-page__stats" aria-label="Profile stats">
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">
                  {profile.stats.crushesReceived}
                </span>
                <span className="profile-page__stat-label">Crushes</span>
              </div>
              <div className="profile-page__stat-divider" aria-hidden />
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">
                  {profile.stats.matches}
                </span>
                <span className="profile-page__stat-label">Matches</span>
              </div>
              <div className="profile-page__stat-divider" aria-hidden />
              <div className="profile-page__stat">
                <span className="profile-page__stat-value">
                  {profile.stats.profileViews}
                </span>
                <span className="profile-page__stat-label">Views</span>
              </div>
            </div>

            <div
              className="profile-page__tabs"
              role="tablist"
              aria-label="Profile content"
            >
              <div className="profile-page__tabs-inner">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "posts"}
                  className={`profile-page__tab ${tab === "posts" ? "profile-page__tab--active" : ""}`}
                  onClick={() => setTab("posts")}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                  </svg>
                  Posts
                  <span className="profile-page__tab-count">
                    {profile.posts.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "likes"}
                  className={`profile-page__tab ${tab === "likes" ? "profile-page__tab--active" : ""}`}
                  onClick={() => setTab("likes")}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Likes
                  <span className="profile-page__tab-count">
                    {receivedLikeCount}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="profile-page__tab-panel" role="tabpanel">
            {tab === "posts" ? (
              <ProfilePostsGrid
                posts={displayPosts}
                onPostClick={(post) => setViewingPostId(post.id)}
                onAdd={atPostLimit ? undefined : () => setSheet("photos")}
                postLimit={MAX_PROFILE_POSTS}
                limitItemLabel="photos"
                addAriaLabel="Add photo"
                addButtonLabel="Add"
              />
            ) : (
              <ProfileLikesPanel
                profileLikers={receivedLikers}
                reciprocatedIds={likedIds}
                isLoadingProfiles={likersLoading}
                onLikeBack={(profileId) => {
                  void sendFlame(profileId).then(() => refetchLikers());
                }}
                onChat={(profileId) => openChatWithProfile(profileId)}
              />
            )}
          </div>
        </div>
      )}

      {profile && (
        <ProfilePostViewer
          posts={displayPosts}
          activePostId={viewingPostId}
          isOwner
          likedProfileIds={likedIds}
          onClose={() => setViewingPostId(null)}
          onChangePost={setViewingPostId}
          onDeletePost={handleDeletePost}
          onHidePost={handleHidePost}
          onLikeBack={(profileId) => void sendFlame(profileId)}
          onChat={(profileId) => openChatWithProfile(profileId)}
        />
      )}

      {profile && (
        <ProfileMenuSheet
          open={menuOpen}
          profile={profile}
          photoCount={photoCount}
          isSubmitting={isSubmitting}
          anchorRef={menuTriggerRef}
          onClose={() => setMenuOpen(false)}
          onSelect={openMenuAction}
        />
      )}

      <GiftEarningsSheet
        open={sheet === "earnings"}
        onClose={closeSheet}
        onRefresh={() => void refetch()}
      />

      <ProfileSheet
        open={sheet === "edit"}
        title="Edit profile"
        fromTop
        hideHandle
        onClose={closeSheet}
      >
        {editSavePhase === "success" ? (
          <SheetSaveSuccess action="profile" onComplete={closeSheet} />
        ) : (
          <div className="profile-sheet__edit-form">
            <label className="profile-sheet__field">
              <span className="profile-sheet__label">Display name</span>
              <input
                className="profile-sheet__input"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="profile-sheet__field">
              <span className="profile-sheet__label">Bio</span>
              <textarea
                className="profile-sheet__textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </label>
            <div className="profile-sheet__field profile-sheet__field--interests">
              <span className="profile-sheet__label">Interests</span>
              <ProfileInterestPicker
                options={interestOptions}
                selectedKeys={editInterestKeys}
                onChange={setEditInterestKeys}
                minSelections={1}
              />
            </div>
            {editError && (
              <p className="profile-sheet__edit-error" role="alert">
                {editError}
              </p>
            )}
            <button
              type="button"
              className="profile-sheet__btn"
              disabled={editSavePhase === "saving"}
              onClick={() => void handleSaveProfile()}
            >
              {editSavePhase === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </ProfileSheet>

      <ProfileSheet
        open={sheet === "photos"}
        title="My photos"
        fromTop
        hideHandle
        onClose={closeSheet}
      >
        {photoSavePhase === "success" ? (
          <SheetSaveSuccess
            action="photo"
            onComplete={() => setPhotoSavePhase("idle")}
          />
        ) : (
          <>
            <div className="profile-sheet__photos">
              <p className="profile-sheet__photos-lead">
                Add up to {MAX_PROFILE_POSTS} photos for your profile and
                discover card. Each photo must be 3 MB or less.
              </p>

              <ProfilePostsGrid
                posts={displayPosts.slice(0, MAX_PROFILE_POSTS)}
                postLimit={MAX_PROFILE_POSTS}
                limitItemLabel="photos"
                showLikeCounts={false}
                addAriaLabel={
                  pendingPhotoFile ? "Choose a different photo" : "Choose photo"
                }
                addButtonLabel={pendingPhotoFile ? "Change" : "Add"}
                onAdd={
                  atPostLimit || isUploadingPhoto ? undefined : openPhotoPicker
                }
              />

              {pendingPhotoPreview && (
                <div className="profile-sheet__photo-preview">
                  <img src={pendingPhotoPreview} alt="Selected photo preview" />
                  <p>Photo selected — tap Add photo when you&apos;re ready.</p>
                </div>
              )}

              {isUploadingPhoto ? (
                <div
                  className="profile-sheet__photos-loader"
                  aria-live="polite"
                >
                  <LogoLoader size="md" label="Uploading photo" />
                </div>
              ) : null}

              {photoUploadError && (
                <p className="profile-sheet__edit-error" role="alert">
                  {photoUploadError}
                </p>
              )}

              <div className="profile-sheet__photos-actions">
                {pendingPhotoFile ? (
                  <>
                    <button
                      type="button"
                      className="profile-sheet__btn"
                      disabled={isUploadingPhoto}
                      onClick={handleConfirmPhotoUpload}
                    >
                      Add photo
                    </button>
                    <button
                      type="button"
                      className="profile-sheet__btn profile-sheet__btn--secondary"
                      disabled={isUploadingPhoto}
                      onClick={clearPendingPhoto}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="profile-sheet__btn"
                    disabled={atPostLimit}
                    onClick={openPhotoPicker}
                  >
                    {atPostLimit ? "Photo limit reached" : "Choose photo"}
                  </button>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoFile}
                tabIndex={-1}
                aria-hidden
              />
            </div>
          </>
        )}
      </ProfileSheet>

      <PlatinumUpgradeSheet open={sheet === "platinum"} onClose={closeSheet} />

      <SafetyPrivacySheet
        open={sheet === "safety"}
        onClose={closeSheet}
        onRequestDeleteAccount={() => setSheet("deleteAccount")}
        onOpenBlockedUsers={() => setSheet("blockedUsers")}
      />

      <BlockedUsersSheet
        open={sheet === "blockedUsers"}
        onClose={() => setSheet("safety")}
      />

      <SettingsSheet
        open={sheet === "settings"}
        onClose={closeSheet}
        onOpenSupport={() => setSheet("support")}
      />

      <SupportChatSheet open={sheet === "support"} onClose={closeSheet} />

      <TrustInfoSheet
        open={sheet === "guidelines"}
        variant="guidelines"
        onClose={closeSheet}
      />

      <TrustInfoSheet
        open={sheet === "terms"}
        variant="terms"
        onClose={closeSheet}
      />

      <VerifyIdentitySheet
        open={sheet === "verify"}
        verified={verified}
        profilePhotoUrl={profilePhotoReference}
        onClose={closeSheet}
        onVerify={completeVerification}
      />

      <ProfileSheet
        open={sheet === "deleteAccount"}
        title="Delete account?"
        fromTop
        hideHandle
        onClose={closeSheet}
      >
        <p
          style={{
            marginBottom: 20,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Your profile, matches, messages, and gifts will be permanently
          deleted. You won&apos;t be able to recover this account.
        </p>
        {deleteError && (
          <p
            style={{
              marginBottom: 16,
              color: "var(--danger, #e5484d)",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {deleteError}
          </p>
        )}
        <button
          type="button"
          className="profile-sheet__btn profile-sheet__btn--danger"
          onClick={handleDeleteAccount}
          disabled={isDeleting || isSubmitting}
        >
          {isDeleting ? "Deleting…" : "Yes, delete permanently"}
        </button>
        <button
          type="button"
          className="profile-sheet__btn profile-sheet__btn--secondary"
          onClick={closeSheet}
        >
          Cancel
        </button>
      </ProfileSheet>

      <SignOutConfirmSheet
        open={sheet === "signout"}
        isSubmitting={isSubmitting}
        onConfirm={handleSignOut}
        onClose={closeSheet}
      />
    </div>
  );
}
