'use client';

import React from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import dynamic from 'next/dynamic';
import EmailNotificationsComponent from '@gitroom/frontend/components/settings/email-notifications.component';
import ShortlinkPreferenceComponent from '@gitroom/frontend/components/settings/shortlink-preference.component';
import DeleteAccountComponent from '@gitroom/frontend/components/settings/delete-account.component';
import { Button } from '@gitroom/react/form/button';
import { useRouter } from 'next/navigation';

const MetricComponent = dynamic(
  () => import('@gitroom/frontend/components/settings/metric.component'),
  {
    ssr: false,
  }
);

export const GlobalSettings = () => {
  const t = useT();
  const router = useRouter();
  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('global_settings', 'Global Settings')}</h3>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="mt-[4px]">{t('setup_guide', 'Setup guide')}</div>
        <div className="flex items-center justify-between gap-[16px] phone:flex-col phone:items-start">
          <div className="flex flex-col">
            <div className="text-[14px]">
              {t('setup_guide_title', 'Connect channels and AI agents')}
            </div>
            <div className="text-[12px] text-textItemBlur">
              {t(
                'setup_guide_description',
                'Walk through the getting started steps again'
              )}
            </div>
          </div>
          {/* the onboarding wizard opens on the calendar with ?onboarding */}
          <Button onClick={() => router.push('/launches?onboarding=true')}>
            {t('open_setup_guide', 'Open setup guide')}
          </Button>
        </div>
      </div>
      <MetricComponent />
      <EmailNotificationsComponent />
      <ShortlinkPreferenceComponent />
      <DeleteAccountComponent />
    </div>
  );
};
