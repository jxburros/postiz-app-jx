import { IsIn, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export const SNAPCHAT_STORY_TTL = [
  'ONE_DAY',
  'TWO_DAYS',
  'THREE_DAYS',
  'ONE_WEEK',
] as const;

export class SnapchatDto {
  @IsIn(['post', 'story'])
  @IsOptional()
  @JSONSchema({
    description:
      'story publishes a Snapchat Story, anything else (or missing) publishes a Spotlight',
  })
  post_type?: 'post' | 'story';

  @IsOptional()
  @ValidateIf((p) => p.link)
  @IsUrl()
  @JSONSchema({
    description: 'Optional link attached to the Story / Spotlight',
  })
  link?: string;

  @IsOptional()
  @IsString()
  @JSONSchema({
    description: 'Spotlight locale, for example en_US (defaults to en_US)',
  })
  locale?: string;

  @IsOptional()
  @ValidateIf((p) => p.story_ttl)
  @IsIn([...SNAPCHAT_STORY_TTL])
  @JSONSchema({
    description:
      'How long a Story stays visible: ONE_DAY, TWO_DAYS, THREE_DAYS or ONE_WEEK (Stories only)',
  })
  story_ttl?: (typeof SNAPCHAT_STORY_TTL)[number];
}
