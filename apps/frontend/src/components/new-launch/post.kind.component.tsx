'use client';

import { FC } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import {
  PostKind,
  useLaunchStore,
} from '@gitroom/frontend/components/new-launch/store';
import { useExistingData } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const StoryIcon: FC<{
  size?: number;
  plus?: boolean;
  className?: string;
}> = ({ size = 20, plus, className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      style={{ minWidth: size, minHeight: size }}
    >
      <circle
        cx="10"
        cy="10"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4.2 2.3"
      />
      {plus ? (
        <path
          d="M10 6.5V13.5M6.5 10H13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <circle cx="10" cy="10" r="4" fill="currentColor" />
      )}
    </svg>
  );
};

export const StoryBadge: FC<{ className?: string }> = ({ className }) => {
  const t = useT();
  return (
    <div
      className={clsx(
        'flex items-center gap-[3px] rounded-full bg-ai text-white text-[10px] font-[600] leading-none px-[5px] py-[2px] whitespace-nowrap',
        className
      )}
    >
      <StoryIcon size={10} />
      <span>{t('story', 'Story')}</span>
    </div>
  );
};

export const PostKindToggle: FC = () => {
  const t = useT();
  const existingData = useExistingData();
  const { postKind, setPostKind, integrations, locked } = useLaunchStore(
    useShallow((state) => ({
      postKind: state.postKind,
      setPostKind: state.setPostKind,
      integrations: state.integrations,
      locked: state.locked,
    }))
  );

  // When editing, the channel is fixed, so stories are only possible if it supports them
  const storiesAvailable = existingData.integration
    ? !!integrations.find((p) => p.id === existingData.integration)?.stories
    : integrations.some((p) => p.stories);

  const options: { value: PostKind; label: string; disabled: boolean }[] = [
    { value: 'post', label: t('post_kind_post', 'Post'), disabled: false },
    {
      value: 'story',
      label: t('post_kind_story', 'Story'),
      disabled: !storiesAvailable,
    },
  ];

  return (
    <div
      className={clsx(
        'flex flex-row p-[4px] border border-newTableBorder rounded-[8px] text-[14px] font-[500] select-none',
        locked && 'opacity-50 pointer-events-none'
      )}
    >
      {options.map((option) => (
        <div
          key={option.value}
          onClick={() => {
            if (option.disabled || postKind === option.value) {
              return;
            }
            setPostKind(option.value);
          }}
          {...(option.disabled && {
            'data-tooltip-id': 'tooltip',
            'data-tooltip-content': t(
              'no_channel_supports_stories',
              'None of the channels here support stories'
            ),
          })}
          className={clsx(
            'pt-[6px] pb-[5px] min-w-[74px] px-[12px] flex justify-center items-center gap-[6px] text-center rounded-[6px] transition-all',
            option.disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer',
            postKind === option.value
              ? 'text-textItemFocused bg-boxFocused'
              : 'text-textItemBlur'
          )}
        >
          {option.value === 'story' && <StoryIcon size={14} />}
          {option.label}
        </div>
      ))}
    </div>
  );
};

export const StoryHint: FC = () => {
  const t = useT();
  const postKind = useLaunchStore((state) => state.postKind);

  if (postKind !== 'story') {
    return null;
  }

  return (
    <div className="flex items-center gap-[10px] rounded-[8px] border border-newTableBorder bg-newBgLineColor px-[12px] py-[10px] text-[14px]">
      <StoryIcon size={18} className="text-ai" />
      <div>
        {t(
          'story_mode_hint',
          'You are creating a story: it is shown full screen for a limited time. Most platforms do not display the story text, so focus on the image or video.'
        )}
      </div>
    </div>
  );
};
