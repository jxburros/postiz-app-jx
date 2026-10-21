'use client';

import React, { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const OrganizationNameModal: FC<{
  mode: 'create' | 'rename';
  currentName?: string;
}> = ({ mode, currentName }) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const [name, setName] = useState(currentName || '');
  const [loading, setLoading] = useState(false);

  const save = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    const response = await fetch(
      mode === 'create'
        ? '/user/organizations'
        : '/user/organizations/current/name',
      {
        method: mode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify({ name: trimmed }),
      }
    );

    if (!response.ok) {
      setLoading(false);
      toaster.show(
        t('could_not_save_profile', 'Could not save the profile'),
        'warning'
      );
      return;
    }

    if (mode === 'create') {
      const { id } = await response.json();
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    }

    modal.closeAll();
    window.location.reload();
  }, [name, mode]);

  return (
    <div className="relative w-full">
      <div className="mb-[24px] flex flex-col gap-[6px]">
        <label htmlFor="profile-name" className="text-[14px] text-white">
          {t('profile_name_label', 'Profile name')}
        </label>
        <input
          id="profile-name"
          value={name}
          maxLength={60}
          autoFocus
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              save();
            }
          }}
          placeholder={t('profile_name_placeholder', 'e.g. Music, Software')}
          className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor px-[16px] text-[14px] outline-none"
        />
      </div>
      <div className="my-[16px] flex gap-[10px]">
        <Button onClick={save} loading={loading} disabled={!name.trim()}>
          {mode === 'create'
            ? t('create_profile', 'Create profile')
            : t('save', 'Save')}
        </Button>
      </div>
    </div>
  );
};
