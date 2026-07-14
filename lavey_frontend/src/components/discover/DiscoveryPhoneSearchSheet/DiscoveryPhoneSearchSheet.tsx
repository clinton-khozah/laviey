import { useEffect, useState, type FormEvent } from "react";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { ApiError } from "@/services/api/apiError";
import "./DiscoveryPhoneSearchSheet.css";

interface DiscoveryPhoneSearchSheetProps {
  open: boolean;
  onClose: () => void;
  onSearch: (value: string, kind: "phone" | "email") => Promise<number>;
}

export function DiscoveryPhoneSearchSheet({
  open,
  onClose,
  onSearch,
}: DiscoveryPhoneSearchSheetProps) {
  const [kind, setKind] = useState<"phone" | "email">("phone");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setKind("phone");
      setQuery("");
      setMessage(null);
      setIsSearching(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (kind === "phone") {
      const digits = query.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        setMessage("Enter a valid cellphone number with its country code.");
        return;
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.trim())) {
      setMessage("Enter a valid email address.");
      return;
    }

    setIsSearching(true);
    setMessage(null);
    try {
      const count = await onSearch(query.trim(), kind);
      if (count > 0) {
        onClose();
      } else {
        setMessage(
          `No opted-in profile was found. They may have chosen not to be found by ${kind === "phone" ? "cellphone number" : "email"}.`,
        );
      }
    } catch (error) {
      if (ApiError.isApiError(error) && error.status === 404) {
        setMessage(
          "Discovery search is being updated. Restart or redeploy the latest backend, then try again.",
        );
      } else {
        setMessage(error instanceof Error ? error.message : "Could not search right now.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ProfileSheet open={open} title="Search Discovery" onClose={onClose} compact hideHandle>
      <form className="discovery-phone-search" onSubmit={(event) => void handleSubmit(event)}>
        <p className="discovery-phone-search__intro">
          Only people who agreed to be found by their cellphone number or email can appear.
        </p>

        <div className="discovery-phone-search__modes" role="group" aria-label="Search method">
          <button
            type="button"
            className={kind === "phone" ? "discovery-phone-search__mode discovery-phone-search__mode--active" : "discovery-phone-search__mode"}
            aria-pressed={kind === "phone"}
            onClick={() => {
              setKind("phone");
              setQuery("");
              setMessage(null);
            }}
          >
            Cellphone
          </button>
          <button
            type="button"
            className={kind === "email" ? "discovery-phone-search__mode discovery-phone-search__mode--active" : "discovery-phone-search__mode"}
            aria-pressed={kind === "email"}
            onClick={() => {
              setKind("email");
              setQuery("");
              setMessage(null);
            }}
          >
            Email
          </button>
        </div>

        <label className="discovery-phone-search__label" htmlFor="discovery-phone-search-input">
          {kind === "phone" ? "Cellphone number" : "Email address"}
        </label>
        <div className="discovery-phone-search__field">
          {kind === "phone" ? <span aria-hidden>+</span> : null}
          <input
            id="discovery-phone-search-input"
            type={kind === "phone" ? "tel" : "email"}
            inputMode={kind === "phone" ? "tel" : "email"}
            autoComplete={kind === "phone" ? "tel" : "email"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={isSearching}
            autoFocus
          />
        </div>

        <p className="discovery-phone-search__privacy">
          Your search is protected and is not added to your imported contacts.
        </p>

        {message ? (
          <p className="discovery-phone-search__message" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="discovery-phone-search__submit"
          disabled={isSearching || query.trim().length === 0}
        >
          {isSearching ? "Searching…" : "Search Discovery"}
        </button>
      </form>
    </ProfileSheet>
  );
}
