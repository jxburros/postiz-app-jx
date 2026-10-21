'use client';

import { usePathname } from 'next/navigation';
import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
export const Title = () => {
  const path = usePathname();
  const { all: menuItems } = useMenuItem();
  const current = menuItems.find((item) => path.indexOf(item.path) > -1);

  return (
    <h1 className="flex items-center gap-[12px] min-w-0">
      {!!current && (
        <span className="w-[40px] h-[40px] shrink-0 rounded-[14px] bg-boxFocused text-textItemFocused flex items-center justify-center">
          {current.icon}
        </span>
      )}
      <span className="truncate">{current?.name}</span>
    </h1>
  );
};
