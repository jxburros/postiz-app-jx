'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  hint?: string;
  collapsed?: boolean;
  onClick?: () => void;
}> = ({ label, icon, path, hint, collapsed, onClick }) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  // Collapsed rail shows the label in a tooltip, expanded rail shows the hint (if any)
  const tooltip = collapsed ? label : hint;

  const className = clsx(
    'group relative flex items-center font-[600] text-[14px] transition-all duration-200 select-none',
    collapsed
      ? 'justify-center mx-auto w-[48px] minCustom:h-[48px] custom:h-[40px] rounded-[16px]'
      : 'w-full gap-[12px] px-[12px] minCustom:h-[44px] custom:h-[38px] rounded-full mobile:justify-center mobile:mx-auto mobile:w-[48px] mobile:px-0 mobile:rounded-[16px]',
    isActive
      ? 'bg-primaryGradient text-white shadow-pill'
      : 'text-textItemBlur hover:text-textItemFocused hover:bg-boxFocused'
  );

  const inner = (
    <>
      <div
        className={clsx(
          'w-[24px] h-[24px] shrink-0 flex items-center justify-center custom:scale-90 transition-transform group-hover:scale-110',
          isActive && 'scale-105'
        )}
      >
        {icon}
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0 truncate text-start leading-[1.2] mobile:hidden">
          {label}
        </div>
      )}
    </>
  );

  const tooltipProps = tooltip
    ? {
        'data-tooltip-id': 'tooltip',
        'data-tooltip-content': tooltip,
        'data-tooltip-place': 'right' as const,
        'data-tooltip-delay-show': 300,
      }
    : {};

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={className}
        {...tooltipProps}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      {...(path.indexOf('http') === 0 && { target: '_blank' })}
      className={className}
      {...tooltipProps}
    >
      {inner}
    </Link>
  );
};
