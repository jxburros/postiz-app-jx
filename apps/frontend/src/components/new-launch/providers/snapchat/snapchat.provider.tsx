'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { SnapchatDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/snapchat.dto';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const SnapchatSettings: FC<{
  values?: any;
}> = () => {
  const t = useT();
  const { register, watch } = useSettings();
  const isStory = watch('post_type') === 'story';

  const storyDuration = [
    { value: 'ONE_DAY', label: t('snapchat_story_one_day', '1 day') },
    { value: 'TWO_DAYS', label: t('snapchat_story_two_days', '2 days') },
    { value: 'THREE_DAYS', label: t('snapchat_story_three_days', '3 days') },
    { value: 'ONE_WEEK', label: t('snapchat_story_one_week', '1 week') },
  ];

  return (
    <div className="flex flex-col">
      <Input
        label={t('snapchat_link', 'Link (optional)')}
        {...register('link')}
      />
      {isStory && (
        <Select
          label={t('snapchat_story_duration', 'Story duration')}
          {...register('story_ttl')}
        >
          <option value="">
            {t('snapchat_story_duration_default', 'Snapchat default')}
          </option>
          {storyDuration.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
};

export default withProvider<SnapchatDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  comments: false,
  SettingsComponent: SnapchatSettings,
  CustomPreviewComponent: undefined,
  dto: SnapchatDto,
  maximumCharacters: 160,
});
