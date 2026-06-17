import { useEffect, useMemo, useRef, useState } from 'react';
import { MatchActionsProvider } from '@/app/providers/MatchActionsProvider';
import { UserSettingsSync } from '@/app/components/UserSettingsSync';
import { AppShell } from '@/components/layout/AppShell';
import { PageTransitionSplash } from '@/components/ui/PageTransitionSplash/PageTransitionSplash';
import { DiscoverPage } from '@/features/discover';
import { MessagesPage } from '@/features/messages';
import { ZoomPage } from '@/features/rooms';
import { ProfilePage } from '@/features/profile';
import { PostPage } from '@/features/post';
import { useConversations, usePushNotifications } from '@/hooks';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import type { NavItemId } from '@/constants/navigation';

type NavigateEventDetail = { nav: NavItemId };

export function MainApp() {
  const [activeNav, setActiveNav] = useState<NavItemId>(() => {
    const pendingNav = window.sessionStorage.getItem('lavey:adminTargetNav');
    if (pendingNav === 'feed' || pendingNav === 'rooms' || pendingNav === 'post' || pendingNav === 'messages' || pendingNav === 'profile') {
      window.sessionStorage.removeItem('lavey:adminTargetNav');
      return pendingNav;
    }
    return 'feed';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { conversations } = useConversations();
  const {
    showPrompt,
    isEnabling,
    enableNotifications,
    dismissPrompt,
  } = usePushNotifications(true);
  const switchTimeoutRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);

  const messageBadgeCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  const page = useMemo(() => {
    switch (activeNav) {
      case 'feed':
        return <DiscoverPage />;
      case 'rooms':
        return <ZoomPage />;
      case 'post':
        return <PostPage />;
      case 'messages':
        return <MessagesPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DiscoverPage />;
    }
  }, [activeNav]);

  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);
      if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  const handleNavigate = (nextNav: NavItemId) => {
    if (nextNav === activeNav || isTransitioning) return;

    if (switchTimeoutRef.current) window.clearTimeout(switchTimeoutRef.current);
    if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);

    setIsTransitioning(true);
    switchTimeoutRef.current = window.setTimeout(() => {
      setActiveNav(nextNav);
      finishTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 50);
  };

  useEffect(() => {
    const onNavigateEvent = (event: Event) => {
      const custom = event as CustomEvent<NavigateEventDetail>;
      const nextNav = custom.detail?.nav;
      if (!nextNav) return;
      handleNavigate(nextNav);
    };
    window.addEventListener('lavey:navigate', onNavigateEvent as EventListener);
    return () => window.removeEventListener('lavey:navigate', onNavigateEvent as EventListener);
  }, [activeNav, isTransitioning]);

  return (
    <MatchActionsProvider>
      <UserSettingsSync />
      <AppShell
        activeNavId={activeNav}
        messageBadgeCount={messageBadgeCount}
        onNavigate={handleNavigate}
      >
        {page}
        {isTransitioning && <PageTransitionSplash />}
      </AppShell>
      <PushNotificationPrompt
        open={showPrompt}
        isEnabling={isEnabling}
        onEnable={() => void enableNotifications()}
        onDismiss={dismissPrompt}
      />
    </MatchActionsProvider>
  );
}
