'use client';

import React, { ReactNode, useCallback, useEffect } from 'react';
import { Logo } from '@gitroom/frontend/components/new-layout/logo';
import { Plus_Jakarta_Sans } from 'next/font/google';
const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CheckPayment } from '@gitroom/frontend/components/layout/check.payment';
import { ToolTip } from '@gitroom/frontend/components/layout/top.tip';
import { ShowMediaBoxModal } from '@gitroom/frontend/components/media/media.component';
import { ShowLinkedinCompany } from '@gitroom/frontend/components/launches/helpers/linkedin.component';
import { MediaSettingsLayout } from '@gitroom/frontend/components/launches/helpers/media.settings.component';
import { Toaster } from '@gitroom/react/toaster/toaster';
import { ShowPostSelector } from '@gitroom/frontend/components/post-url-selector/post.url.selector';
import { NewSubscription } from '@gitroom/frontend/components/layout/new.subscription';
import { Support } from '@gitroom/frontend/components/layout/support';
import { ContinueProvider } from '@gitroom/frontend/components/layout/continue.provider';
import { ContextWrapper } from '@gitroom/frontend/components/layout/user.context';
import { CopilotKit } from '@copilotkit/react-core';
import { MantineWrapper } from '@gitroom/react/helpers/mantine.wrapper';
import { Impersonate } from '@gitroom/frontend/components/layout/impersonate';
import { AnnouncementBanner } from '@gitroom/frontend/components/layout/announcement.banner';
import { Title } from '@gitroom/frontend/components/layout/title';
import { TopMenu } from '@gitroom/frontend/components/layout/top.menu';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { ChromeExtensionComponent } from '@gitroom/frontend/components/layout/chrome.extension.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { StreakComponent } from '@gitroom/frontend/components/layout/streak.component';
import { PreConditionComponent } from '@gitroom/frontend/components/layout/pre-condition.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import { FirstBillingComponent } from '@gitroom/frontend/components/billing/first.billing.component';
import { TrialTracker } from '@gitroom/frontend/components/layout/gtm.component';
import { setSentryUser } from '@gitroom/react/sentry/initialize.sentry.client';
import useCookie from 'react-use-cookie';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['600', '500', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

const CollapseMenuButton = ({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) => {
  const t = useT();
  const label = collapsed
    ? t('expand_menu', 'Expand menu')
    : t('collapse_menu', 'Collapse menu');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={!collapsed}
      {...(collapsed && {
        'data-tooltip-id': 'tooltip',
        'data-tooltip-content': label,
        'data-tooltip-place': 'right' as const,
      })}
      className={clsx(
        'mobile:hidden flex items-center h-[36px] rounded-full text-[13px] font-[600] text-textItemBlur hover:text-textItemFocused hover:bg-boxFocused transition-all',
        collapsed ? 'justify-center mx-auto w-[48px]' : 'gap-[12px] px-[12px] w-full'
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className={clsx(
          'shrink-0 transition-transform rtl:rotate-180',
          collapsed && 'rotate-180 rtl:rotate-0'
        )}
      >
        <path
          d="M12.5 15L7.5 10L12.5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
};

export const LayoutComponent = ({ children }: { children: ReactNode }) => {
  const fetch = useFetch();
  const [menuCollapsed, setMenuCollapsed] = useCookie('menu_collapsed', 'false');
  const collapsed = menuCollapsed === 'true';
  const toggleMenu = useCallback(() => {
    setMenuCollapsed(collapsed ? 'false' : 'true', { days: 365 });
  }, [collapsed, setMenuCollapsed]);

  const { backendUrl, billingEnabled, isGeneral } = useVariables();

  // Feedback icon component attaches Sentry feedback to a top-bar icon when DSN is present
  const searchParams = useSearchParams();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { data: user, mutate } = useSWR('/user/self', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  useEffect(() => {
    setSentryUser(
      user ? { id: user.id, email: user.email, orgId: user.orgId } : null
    );
  }, [user]);

  if (!user) return null;

  return (
    <ContextWrapper user={user}>
      <CopilotKit
        credentials="include"
        runtimeUrl={backendUrl + '/copilot/chat'}
        useSingleEndpoint={true}
        showDevConsole={false}
      >
        <MantineWrapper>
          <ToolTip />
          <Toaster />
          <TrialTracker />
          <CheckPayment check={searchParams.get('check') || ''} mutate={mutate}>
            <ShowMediaBoxModal />
            <ShowLinkedinCompany />
            <MediaSettingsLayout />
            <ShowPostSelector />
            <PreConditionComponent />
            <NewSubscription />
            <ContinueProvider />
            <div
              className={clsx(
                'flex flex-col min-h-screen min-w-screen text-newTextColor p-[12px]',
                jakartaSans.className
              )}
            >
              <div>{user?.admin ? <Impersonate /> : <div />}</div>
              {user.tier === 'FREE' && isGeneral && billingEnabled ? (
                <FirstBillingComponent />
              ) : (
                <>
                  <AnnouncementBanner />
                  <div className="flex-1 flex gap-[12px]">
                    <Support />
                    <div
                      className={clsx(
                        'flex flex-col bg-newBgColorInner rounded-[20px] shadow-card shrink-0 transition-[width] duration-200 mobile:w-[80px]',
                        collapsed ? 'w-[80px]' : 'w-[232px]'
                      )}
                    >
                      <div
                        id="left-menu"
                        className={clsx(
                          'fixed h-full start-[12px] flex flex-1 top-0 py-[12px] transition-[width] duration-200 mobile:w-[80px]',
                          collapsed ? 'w-[80px]' : 'w-[232px]',
                          user?.admin && 'pt-[60px] max-h-[1000px]:w-[500px]'
                        )}
                      >
                        <div className="flex flex-col h-full minCustom:gap-[28px] custom:gap-[16px] flex-1 py-[16px] px-[12px] overflow-y-auto overflow-x-hidden scrollbar-none">
                          <div
                            className={clsx(
                              'flex items-center mobile:justify-center',
                              collapsed ? 'justify-center' : 'px-[4px]'
                            )}
                          >
                            <Logo />
                          </div>
                          <TopMenu collapsed={collapsed} />
                          <CollapseMenuButton
                            collapsed={collapsed}
                            onClick={toggleMenu}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 bg-newBgLineColor rounded-[20px] shadow-card overflow-hidden flex flex-col gap-[1px] blurMe">
                      <div className="flex bg-newBgColorInner min-h-[72px] px-[24px] py-[12px] items-center gap-[16px]">
                        <div className="flex flex-1 items-center gap-[16px] min-w-0">
                          <div className="text-[22px] font-[700] min-w-0">
                            <Title />
                          </div>
                          <OrganizationSelector />
                        </div>
                        <div className="flex items-center gap-[12px] text-textItemBlur">
                          <StreakComponent />
                          <div className="flex items-center gap-[16px] h-[44px] px-[16px] rounded-full bg-newBgColor border border-newBorder">
                            <div className="flex hover:text-newTextColor">
                              <ModeComponent />
                            </div>
                            <LanguageComponent />
                            <ChromeExtensionComponent />
                            <div className="w-[1px] h-[20px] bg-newSep" />
                            <AttachToFeedbackIcon />
                            <NotificationComponent />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-1 gap-[1px]">{children}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CheckPayment>
        </MantineWrapper>
      </CopilotKit>
    </ContextWrapper>
  );
};
