import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export type PostListStateFilter = 'all' | 'scheduled' | 'draft' | 'published';
export type PostListKindFilter = 'all' | 'posts' | 'stories';

export class GetPostsListDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsIn(['all', 'scheduled', 'draft', 'published'])
  state?: PostListStateFilter = 'all';

  @IsOptional()
  @IsIn(['all', 'posts', 'stories'])
  kind?: PostListKindFilter = 'all';
}
