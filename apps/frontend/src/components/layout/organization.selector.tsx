'use client';

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { OrganizationNameModal } from '@gitroom/frontend/components/layout/organization.name.modal';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

const avatarColors = [
  '#FF5C8A',
  '#FF8A3D',
  '#FFC21A',
  '#2ED47A',
  '#19C3D6',
  '#3D8BFF',
  '#8F6BFF',
  '#E85CFF',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const ProfileAvatar: FC<{ name: string }> = ({ name }) => (
  <div
    className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[12px] font-[600] text-white shrink-0"
    style={{ backgroundColor: getAvatarColor(name) }}
  >
    {(name || '?').trim().charAt(0).toUpperCase()}
  </div>
);

const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  return useSWR<
    {
      id: string;
      name: string;
      users: { role: 'SUPERADMIN' | 'ADMIN' | 'USER' }[];
    }[]
  >('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

export const OrganizationSelector: FC<{ asOpenSelect?: boolean }> = ({
  asOpenSelect,
}) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const modals = useModals();
  const { billingEnabled } = useVariables();
  const { isLoading, data } = useOrganizations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    return data?.find((d) => d.id === user?.orgId);
  }, [data, user?.orgId]);

  const canRename = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  const changeOrg = useCallback(
    (org: { name: string; id: string }) => async () => {
      if (org.id === user?.orgId) {
        setOpen(false);
        return;
      }
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({
          id: org.id,
        }),
      });
      window.location.reload();
    },
    [user?.orgId]
  );

  const openNameModal = useCallback(
    (mode: 'create' | 'rename') => () => {
      setOpen(false);
      modals.openModal({
        title:
          mode === 'create'
            ? t('new_profile', 'New profile')
            : t('rename_profile', 'Rename profile'),
        size: '500px',
        children: (
          <OrganizationNameModal mode={mode} currentName={current?.name} />
        ),
      });
    },
    [current?.name]
  );

  if (isLoading || !data) {
    return null;
  }

  const list = (
    <div
      className={clsx(
        'py-[8px] flex-col bg-third border-tableBorder border rounded-[8px] min-w-[220px] w-max max-w-[400px]',
        asOpenSelect
          ? 'flex relative max-w-[500px] mx-auto mb-[10px]'
          : 'absolute top-[100%] end-0 z-[300] mt-[6px] shadow-lg ' +
              (open ? 'flex' : 'hidden')
      )}
    >
      {asOpenSelect && (
        <div className="px-[12px] pb-[8px] text-[12px] text-textItemBlur">
          {t('select_profile', 'Select profile')}
        </div>
      )}
      {data.map((org) => (
        <div
          key={org.id}
          onClick={changeOrg(org)}
          className="flex items-center gap-[10px] px-[12px] py-[8px] cursor-pointer hover:bg-newBgLineColor"
        >
          <ProfileAvatar name={org.name} />
          <div className="flex-1 whitespace-nowrap truncate">{org.name}</div>
          {org.id === user?.orgId && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8.5L6.5 12L13 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ))}
      {!asOpenSelect && (!billingEnabled || canRename) && (
        <div className="h-[1px] bg-blockSeparator my-[6px]" />
      )}
      {!asOpenSelect && !billingEnabled && (
        <div
          onClick={openNameModal('create')}
          className="px-[12px] py-[8px] cursor-pointer hover:bg-newBgLineColor whitespace-nowrap"
        >
          + {t('new_profile', 'New profile')}
        </div>
      )}
      {!asOpenSelect && canRename && (
        <div
          onClick={openNameModal('rename')}
          className="px-[12px] py-[8px] cursor-pointer hover:bg-newBgLineColor whitespace-nowrap"
        >
          {t('rename_profile', 'Rename profile')}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div ref={ref} className="hover:text-newTextColor">
        <div className="text-[12px] relative">
          {asOpenSelect ? (
            list
          ) : (
            <>
              <div
                className="flex items-center gap-[8px] cursor-pointer select-none"
                onClick={() => setOpen((p) => !p)}
              >
                <ProfileAvatar name={current?.name || ''} />
                {!!current?.name && (
                  <div className="max-w-[240px] truncate">{current.name}</div>
                )}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={clsx(
                    'transition-transform',
                    open && 'rotate-180'
                  )}
                >
                  <path
                    d="M2.5 4.5L6 8L9.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {list}
            </>
          )}
        </div>
      </div>
      {!asOpenSelect && <div className="w-[1px] h-[20px] bg-blockSeparator" />}
    </>
  );
};
