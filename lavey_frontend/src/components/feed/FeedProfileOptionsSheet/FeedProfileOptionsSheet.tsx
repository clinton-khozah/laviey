import { useEffect, useState } from "react";
import { FeedProfileAvatar } from "@/components/feed/FeedProfileAvatar";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { hasCustomProfileAvatar } from "@/utils/discover/discoverProfileReady";
import type { Profile } from "@/types";
import "./FeedProfileOptionsSheet.css";

export type FeedProfileOptionAction =
  | "clear-photo"
  | "view-profile"
  | "report"
  | "block";

export interface FeedProfileActionMeta {
  reportReason?: string;
}

const REPORT_REASONS = [
  "Inappropriate photos",
  "Inappropriate bio or profile",
  "Harassment or hate speech",
  "Fake profile or scam",
  "Spam or advertising",
  "Underage concern",
  "Other",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];
type SheetStep = "menu" | "report" | "report-confirm" | "block-confirm";

interface FeedProfileOptionsSheetProps {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onAction: (
    action: FeedProfileOptionAction,
    profile: Profile,
    meta?: FeedProfileActionMeta,
  ) => void | Promise<void>;
}

function sheetTitle(step: SheetStep): string {
  switch (step) {
    case "menu":
      return "Options";
    case "report":
      return "Report";
    case "report-confirm":
      return "Report?";
    case "block-confirm":
      return "Block?";
  }
}

export function FeedProfileOptionsSheet({
  open,
  profile,
  onClose,
  onAction,
}: FeedProfileOptionsSheetProps) {
  const [busyAction, setBusyAction] = useState<FeedProfileOptionAction | null>(
    null,
  );
  const [step, setStep] = useState<SheetStep>("menu");
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDetails, setReportDetails] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("menu");
      setReportReason("");
      setReportDetails("");
      setBusyAction(null);
    }
  }, [open]);

  if (!profile) return null;

  const avatarSrc = hasCustomProfileAvatar(profile.avatar)
    ? profile.avatar
    : undefined;

  const handleClose = () => {
    if (busyAction) return;
    onClose();
  };

  const runAction = async (
    action: FeedProfileOptionAction,
    meta?: FeedProfileActionMeta,
  ) => {
    if (busyAction) return;
    setBusyAction(action);
    try {
      await onAction(action, profile, meta);
      onClose();
    } finally {
      setBusyAction(null);
    }
  };

  const resolvedReportReason =
    reportReason === "Other" ? reportDetails.trim() : reportReason;

  const canContinueReport = Boolean(
    reportReason &&
    (reportReason !== "Other" || reportDetails.trim().length >= 3),
  );

  const renderIntro = () => (
    <div className="feed-profile-options__intro">
      <FeedProfileAvatar
        name={profile.name}
        src={avatarSrc}
        className="feed-profile-options__avatar"
        size="sm"
      />
      <div className="feed-profile-options__intro-text">
        <p className="feed-profile-options__name-row">
          <strong>{profile.name}</strong>
          {profile.verified ? (
            <VerifiedBadge size="sm" title="Verified" />
          ) : null}
        </p>
        <p className="feed-profile-options__meta">
          {profile.vibeScore
            ? `${profile.vibeScore}% vibe match`
            : "For You profile"}
        </p>
      </div>
    </div>
  );

  const renderMenu = () => (
    <>
      {renderIntro()}

      <button
        type="button"
        className="feed-profile-options__action"
        disabled={Boolean(busyAction)}
        onClick={() => void runAction("clear-photo")}
      >
        <span className="feed-profile-options__icon" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path d="M21 15l-5-5L5 20" />
          </svg>
        </span>
        <span className="feed-profile-options__copy">
          <strong>View clear photo</strong>
          <span>Hide everything; tap the photo to bring it back</span>
        </span>
      </button>

      <button
        type="button"
        className="feed-profile-options__action"
        disabled={Boolean(busyAction)}
        onClick={() => void runAction("view-profile")}
      >
        <span className="feed-profile-options__icon" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="feed-profile-options__copy">
          <strong>View profile</strong>
          <span>See photos, bio, and vibes</span>
        </span>
      </button>

      <button
        type="button"
        className="feed-profile-options__action"
        disabled={Boolean(busyAction)}
        onClick={() => setStep("report")}
      >
        <span
          className="feed-profile-options__icon feed-profile-options__icon--warn"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </span>
        <span className="feed-profile-options__copy">
          <strong>Report</strong>
          <span>Flag inappropriate photos, bio, or behavior</span>
        </span>
      </button>

      <button
        type="button"
        className="feed-profile-options__action feed-profile-options__action--danger"
        disabled={Boolean(busyAction)}
        onClick={() => setStep("block-confirm")}
      >
        <span
          className="feed-profile-options__icon feed-profile-options__icon--danger"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </svg>
        </span>
        <span className="feed-profile-options__copy">
          <strong>Block</strong>
          <span>Hide from For You and stop them contacting you</span>
        </span>
      </button>

      <button
        type="button"
        className="feed-profile-options__cancel"
        onClick={handleClose}
      >
        Cancel
      </button>
    </>
  );

  const renderReportReasons = () => (
    <>
      <p className="feed-profile-options__lead">
        Why are you reporting <strong>{profile.name}</strong>?
      </p>

      <div
        className="feed-profile-options__reasons"
        role="radiogroup"
        aria-label="Report reason"
      >
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            role="radio"
            aria-checked={reportReason === reason}
            className={`feed-profile-options__reason${reportReason === reason ? " feed-profile-options__reason--selected" : ""}`}
            onClick={() => setReportReason(reason)}
          >
            {reason}
          </button>
        ))}
      </div>

      {reportReason === "Other" ? (
        <label className="feed-profile-options__details-label">
          <span>Describe the issue</span>
          <textarea
            className="feed-profile-options__details"
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            placeholder="Briefly explain what happened…"
            rows={3}
            maxLength={500}
          />
        </label>
      ) : null}

      <div className="feed-profile-options__step-actions">
        <button
          type="button"
          className="feed-profile-options__back"
          onClick={() => setStep("menu")}
        >
          Back
        </button>
        <button
          type="button"
          className="feed-profile-options__primary feed-profile-options__primary--warn"
          disabled={!canContinueReport}
          onClick={() => setStep("report-confirm")}
        >
          Continue
        </button>
      </div>
    </>
  );

  const renderReportConfirm = () => (
    <>
      <p className="feed-profile-options__confirm-message">
        Are you sure you want to report <strong>{profile.name}</strong>?
      </p>
      <p className="feed-profile-options__confirm-detail">
        Reason: <span>{resolvedReportReason}</span>
      </p>
      <p className="feed-profile-options__confirm-note">
        Our team will review this report. This profile will be hidden from your
        For You feed.
      </p>

      <div className="feed-profile-options__step-actions">
        <button
          type="button"
          className="feed-profile-options__back"
          disabled={busyAction === "report"}
          onClick={() => setStep("report")}
        >
          Back
        </button>
        <button
          type="button"
          className="feed-profile-options__primary feed-profile-options__primary--warn"
          disabled={busyAction === "report"}
          onClick={() =>
            void runAction("report", { reportReason: resolvedReportReason })
          }
        >
          {busyAction === "report" ? "Submitting…" : "Yes, report"}
        </button>
      </div>
    </>
  );

  const renderBlockConfirm = () => (
    <>
      <p className="feed-profile-options__confirm-message">
        Are you sure you want to block <strong>{profile.name}</strong>?
      </p>
      <p className="feed-profile-options__confirm-note">
        They won&apos;t appear on your For You feed and can&apos;t message you.
        You can unblock them later in Settings.
      </p>

      <div className="feed-profile-options__step-actions">
        <button
          type="button"
          className="feed-profile-options__back"
          disabled={busyAction === "block"}
          onClick={() => setStep("menu")}
        >
          Back
        </button>
        <button
          type="button"
          className="feed-profile-options__primary feed-profile-options__primary--danger"
          disabled={busyAction === "block"}
          onClick={() => void runAction("block")}
        >
          {busyAction === "block" ? "Blocking…" : "Yes, block"}
        </button>
      </div>
    </>
  );

  return (
    <ProfileSheet
      open={open}
      title={sheetTitle(step)}
      onClose={handleClose}
      compact
      menu
    >
      <div className="feed-profile-options">
        {step === "menu" ? renderMenu() : null}
        {step === "report" ? renderReportReasons() : null}
        {step === "report-confirm" ? renderReportConfirm() : null}
        {step === "block-confirm" ? renderBlockConfirm() : null}
      </div>
    </ProfileSheet>
  );
}
