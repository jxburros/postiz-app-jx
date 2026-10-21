import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import {
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { SnapchatDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/snapchat.dto';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { Integration } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';

const SNAPCHAT_API = 'https://businessapi.snapchat.com';

@Rules(
  [
    'Snapchat requires exactly one video (MP4) and nothing else.',
    'post_type=story publishes a Snapchat Story (5-60 seconds, at least 540x960), the post text is ignored for Stories.',
    'Any other post_type publishes a Spotlight (6-60 seconds), the post text becomes the Spotlight description (maximum 160 characters, hashtags allowed). Spotlights are reviewed by Snapchat before they go live.',
    'story_ttl only applies to Stories.',
  ].join(' ')
)
export class SnapchatProvider extends SocialAbstract implements SocialProvider {
  identifier = 'snapchat';
  name = 'Snapchat';
  isBetweenSteps = false;
  stories = true;
  scopes = ['snapchat-profile-api'];
  toolTip =
    'Uses the Snapchat Public Profile API, which is allowlist-only: request access from Snap first, then create the OAuth app in Snapchat Business Dashboard > Business Details';
  editor = 'normal' as const;
  dto = SnapchatDto;
  maxLength() {
    return 160;
  }

  // Snapchat accepts encrypted chunks of at most 32MB.
  private static readonly SNAPCHAT_CHUNK_SIZE = 32 * 1024 * 1024;

  override async checkValidity(
    posts: Array<ValidityMedia[]>
  ): Promise<string | true> {
    const [firstPost, ...restPosts] = posts ?? [];

    if (
      firstPost?.length !== 1 ||
      !hasExtension(firstPost?.[0]?.path, 'mp4')
    ) {
      return 'Snapchat requires exactly one video';
    }

    if (restPosts?.some((p) => (p?.length ?? 0) > 0)) {
      return 'Snapchat does not support comments';
    }

    return true;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry';
        value: string;
      }
    | undefined {
    if (
      body.indexOf('invalid_token') > -1 ||
      body.indexOf('INVALID_ACCESS_TOKEN') > -1 ||
      body.indexOf('UNAUTHORIZED') > -1
    ) {
      return {
        type: 'refresh-token' as const,
        value: 'Snapchat access token expired, please re-authenticate',
      };
    }

    if (body.indexOf('MEDIA_EXPIRED') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'The uploaded media expired on Snapchat, please try again',
      };
    }

    if (body.indexOf('MEDIA_POSTING_ALREADY_IN_PROGRESS') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'Snapchat is already publishing this media',
      };
    }

    if (body.indexOf('VALIDATION_ERROR_INVALID_LINK') > -1) {
      return {
        type: 'bad-body' as const,
        value: 'The link is not accepted by Snapchat, please check the URL',
      };
    }

    if (body.indexOf('VALIDATION_ERROR') > -1) {
      return {
        type: 'bad-body' as const,
        value:
          'Snapchat rejected the post, please check the video specifications (MP4, 5-60 seconds, at least 540x960)',
      };
    }

    return undefined;
  }

  private redirectUri() {
    return `${process.env.FRONTEND_URL}/integrations/social/snapchat`;
  }

  private async getProfile(accessToken: string) {
    const { public_profile } = await (
      await this.fetch(`${SNAPCHAT_API}/v1/public_profiles/my_profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    return {
      id: public_profile.id,
      name: public_profile.display_name || public_profile.snap_user_name,
      username: public_profile.snap_user_name,
      picture: public_profile?.logo_urls?.original_logo_url || '',
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const { access_token, refresh_token, expires_in } = await (
      await this.fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SNAPCHAT_CLIENT_ID!,
          client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
        }),
      })
    ).json();

    const { id, name, username, picture } = await this.getProfile(
      access_token
    );

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken,
      expiresIn: expires_in,
      picture,
      username,
    };
  }

  async generateAuthUrl() {
    const state = makeSecureId(6);
    return {
      url:
        'https://accounts.snapchat.com/login/oauth2/authorize' +
        `?response_type=code` +
        `&client_id=${process.env.SNAPCHAT_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri())}` +
        `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
        `&state=${state}`,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const { access_token, refresh_token, expires_in } = await (
      await this.fetch('https://accounts.snapchat.com/login/oauth2/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.SNAPCHAT_CLIENT_ID!,
          client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
          code: params.code,
          redirect_uri: this.redirectUri(),
        }),
      })
    ).json();

    const { id, name, username, picture } = await this.getProfile(
      access_token
    );

    return {
      id,
      name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      picture,
      username,
    };
  }

  // Snapchat only accepts media encrypted with AES-256-CBC (PKCS7 padding,
  // the node default). The media is streamed through the cipher, so only the
  // encrypted copy is held in memory.
  private async encryptMedia(path: string) {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    const encrypted: Buffer[] = [];
    for await (const chunk of await this.mediaStream(
      path,
      'snapchat-error-upload'
    )) {
      encrypted.push(cipher.update(chunk as Buffer));
    }
    encrypted.push(cipher.final());

    return { key, iv, encrypted: Buffer.concat(encrypted) };
  }

  private apiPath(path: string) {
    return `${SNAPCHAT_API}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private async uploadMedia(
    profileId: string,
    accessToken: string,
    path: string
  ): Promise<string> {
    const { key, iv, encrypted } = await this.encryptMedia(path);

    const { media_id, add_path, finalize_path } = await (
      await this.fetch(
        `${SNAPCHAT_API}/v1/public_profiles/${profileId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            type: 'VIDEO',
            name: path.split('/').pop()?.split('?')[0] || 'video.mp4',
            key: key.toString('base64'),
            iv: iv.toString('base64'),
          }),
        },
        'snapchat-error-upload'
      )
    ).json();

    const totalParts = Math.max(
      1,
      Math.ceil(encrypted.length / SnapchatProvider.SNAPCHAT_CHUNK_SIZE)
    );

    for (let i = 0; i < totalParts; i++) {
      const form = new FormData();
      form.append('action', 'ADD');
      form.append(
        'file',
        new Blob([
          encrypted.subarray(
            i * SnapchatProvider.SNAPCHAT_CHUNK_SIZE,
            (i + 1) * SnapchatProvider.SNAPCHAT_CHUNK_SIZE
          ),
        ]),
        `part_${i + 1}`
      );
      form.append('part_number', String(i + 1));

      await this.fetch(
        this.apiPath(add_path),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        },
        'snapchat-error-upload'
      );
    }

    const finalize = new FormData();
    finalize.append('action', 'FINALIZE');

    await this.fetch(
      this.apiPath(finalize_path),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: finalize,
      },
      'snapchat-error-upload'
    );

    return media_id;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<SnapchatDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const settings = firstPost?.settings || ({} as SnapchatDto);
    const isStory = settings.post_type === 'story';

    const mediaId = await this.uploadMedia(
      id,
      accessToken,
      firstPost.media?.[0]?.path!
    );

    const releaseURL = `https://www.snapchat.com/add/${integration.profile}`;

    if (isStory) {
      const story = await (
        await this.fetch(
          `${SNAPCHAT_API}/v1/public_profiles/${id}/stories`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              media_id: mediaId,
              ...(settings.link ? { link: settings.link } : {}),
              ...(settings.story_ttl
                ? { customized_ttl: { ttl: settings.story_ttl } }
                : {}),
            }),
          },
          'snapchat-error-story'
        )
      ).json();

      return [
        {
          id: firstPost.id,
          postId: String(story?.story_id || story?.id || mediaId),
          releaseURL,
          status: 'success',
        },
      ];
    }

    // Spotlights start as SUBMITTED and are reviewed by Snapchat before they
    // go live, there is nothing to wait for on our side.
    const description = (firstPost.message || '').trim().slice(0, 160);
    const { spotlight_id } = await (
      await this.fetch(
        `${SNAPCHAT_API}/v1/public_profiles/${id}/spotlights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            media_id: mediaId,
            locale: settings.locale || 'en_US',
            ...(description ? { description } : {}),
            ...(settings.link ? { link: settings.link } : {}),
          }),
        },
        'snapchat-error-spotlight'
      )
    ).json();

    return [
      {
        id: firstPost.id,
        postId: String(spotlight_id || mediaId),
        releaseURL,
        status: 'success',
      },
    ];
  }
}
