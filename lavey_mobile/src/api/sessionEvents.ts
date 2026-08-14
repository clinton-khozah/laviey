type SessionExpiredPayload = {
  provider?: 'google' | 'email';
};

type Listener = (payload?: SessionExpiredPayload) => void;

const listeners = new Set<Listener>();

export const sessionEvents = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  expired(payload?: SessionExpiredPayload) {
    listeners.forEach((listener) => listener(payload));
  },
};
