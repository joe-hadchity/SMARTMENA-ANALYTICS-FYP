'use client';

import React from 'react';

// Phosphor-style icon paths from Claude Design
const ICON_PATHS: Record<string, string> = {
  ChartLineUp: 'M32 200V56M32 200h176M52 168l52-52 32 32 60-72',
  Megaphone: 'M56 96v64a16 16 0 0 0 16 16h32l40 32V48l-40 32H72a16 16 0 0 0-16 16ZM200 88a40 40 0 0 1 0 80M104 176v40a8 8 0 0 0 16 0v-24',
  Article: 'M40 56h176v144H40zM72 96h112M72 128h112M72 160h72',
  TrendUp: 'M232 56l-72 72-40-40-72 72M168 56h64v64',
  Lightbulb: 'M88 200h80M96 224h64M168 168a64 64 0 1 0-80 0v16h80Z',
  PencilSimple: 'M96 216H40v-56L160 40l56 56Z',
  CalendarBlank: 'M40 56h176v160H40zM176 32v48M80 32v48M40 96h176',
  PlugsConnected: 'M152 96l-56 56M80 96l24 24M136 152l24 24M80 32l24 24-32 32-24-24ZM176 152l24 24-32 32-24-24ZM192 64l32-32M64 192l-32 32',
  Strategy: 'M48 64a16 16 0 1 1 32 0 16 16 0 1 1-32 0ZM176 64a16 16 0 1 1 32 0 16 16 0 1 1-32 0ZM48 192a16 16 0 1 1 32 0 16 16 0 1 1-32 0ZM176 192a16 16 0 1 1 32 0 16 16 0 1 1-32 0ZM80 64h96M64 80v96M192 80v96M80 192h96',
  BookOpen: 'M24 56h80a32 32 0 0 1 32 32v120a24 24 0 0 0-24-24H24Zm208 0h-80a32 32 0 0 0-32 32v120a24 24 0 0 1 24-24h88Z',
  FileText: 'M48 32h112l48 48v144H48zM160 32v48h48M88 128h80M88 160h80M88 96h32',
  CaretRight: 'M96 48l80 80-80 80',
  CaretLeft: 'M160 208 80 128l80-80',
  ArrowUp: 'M128 216V40m-48 48 48-48 48 48',
  ArrowDown: 'M128 40v176m-48-48 48 48 48-48',
  TrendDown: 'M232 200l-72-72-40 40-72-72M168 200h64v-64',
  Sun: 'M128 56V32M64 64 48 48M56 128H32M64 192l-16 16M128 200v24M192 192l16 16M200 128h24M192 64l16-16M128 80a48 48 0 1 1 0 96 48 48 0 1 1 0-96Z',
  Moon: 'M227.6 161.7A92 92 0 0 1 94.3 28.4a92 92 0 1 0 133.3 133.3Z',
  Bell: 'M56 104a72 72 0 1 1 144 0v40c0 16 16 32 16 32H40s16-16 16-32Zm46 96a32 32 0 0 0 52 0',
  Plus: 'M40 128h176M128 40v176',
  SquaresFour: 'M40 40h72v72H40zM144 40h72v72h-72zM40 144h72v72H40zM144 144h72v72h-72z',
  Grid2X2: 'M40 40h72v72H40zM144 40h72v72h-72zM40 144h72v72H40zM144 144h72v72h-72z',
  InstagramLogo: 'M40 76v104a36 36 0 0 0 36 36h104a36 36 0 0 0 36-36V76a36 36 0 0 0-36-36H76a36 36 0 0 0-36 36ZM128 88a40 40 0 1 0 0 80 40 40 0 1 0 0-80ZM180 76v0',
  FacebookLogo: 'M168 88h-24a16 16 0 0 0-16 16v128M96 144h64M128 24a104 104 0 1 0 0 208 104 104 0 1 0 0-208Z',
  TiktokLogo: 'M168 32a48 48 0 0 0 48 48v32a80 80 0 0 1-48-16v72a64 64 0 1 1-64-64v32a32 32 0 1 0 32 32V32Z',
  XLogo: 'M40 40l176 176M216 40 40 216',
  LinkedinLogo: 'M40 40h176v176H40zM96 112v64M96 88v0M152 176v-32a16 16 0 0 0-32 0M120 176v-64',
  YoutubeLogo: 'M24 88a24 24 0 0 1 24-24h160a24 24 0 0 1 24 24v80a24 24 0 0 1-24 24H48a24 24 0 0 1-24-24Zm88 16v48l40-24Z',
  SnapchatLogo: 'M196 168s-12 28-44 28c-16 0-20-12-32-12s-16 12-32 12c-32 0-44-28-44-28 36-8 40-44 40-72v-8a44 44 0 1 1 88 0v8c0 28 4 64 24 72Z',
  Gear: 'M128 80a48 48 0 1 0 0 96 48 48 0 1 0 0-96ZM200 128a72 72 0 0 0-1.6-15.2l25.4-19.8a8 8 0 0 0 1.8-10.5l-22.4-38.8a8 8 0 0 0-9.7-3.6l-30 12a72 72 0 0 0-26.5-15.3l-4.5-31.7A8 8 0 0 0 124.5 0h-44.8a8 8 0 0 0-8 6.9l-4.5 31.7a72 72 0 0 0-26.5 15.3l-30-12a8 8 0 0 0-9.7 3.6l-22.4 38.8a8 8 0 0 0 1.8 10.5L6 112.8A72 72 0 0 0 4.4 128c0 5.2.6 10.3 1.6 15.2l-25.4 19.8',
  Sparkle: 'M120 56V16M104 32h32M192 96V56M168 76h48M120 240l-26-78-78-26 78-26 26-78 26 78 78 26-78 26Z',
  Stack: 'M24 80l104-48 104 48-104 48ZM24 128l104 48 104-48M24 176l104 48 104-48',
  MagnifyingGlass: 'M112 112m-80 0a80 80 0 1 0 160 0a80 80 0 1 0-160 0M216 216l-48-48',
  Clock: 'M128 64v64l48 48M128 32a96 96 0 1 0 0 192 96 96 0 1 0 0-192Z',
  Users: 'M128 128a32 32 0 1 0 0-64 32 32 0 1 0 0 64ZM64 128a32 32 0 1 0 0-64 32 32 0 1 0 0 64ZM192 128a32 32 0 1 0 0-64 32 32 0 1 0 0 64ZM128 160c-32 0-48 16-48 32v16h96v-16c0-16-16-32-48-32ZM64 160c-32 0-48 16-48 32v16h64M192 160c32 0 48 16 48 32v16h-64',
  Target: 'M128 32a96 96 0 1 0 0 192 96 96 0 1 0 0-192ZM128 80a48 48 0 1 0 0 96 48 48 0 1 0 0-96ZM128 104a24 24 0 1 0 0 48 24 24 0 1 0 0-48Z',
};

interface IconProps {
  name: keyof typeof ICON_PATHS;
  size?: number;
  weight?: 'regular' | 'bold' | 'fill';
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Icon({
  name,
  size = 18,
  weight = 'regular',
  color = 'currentColor',
  style,
  className,
}: IconProps) {
  const d = ICON_PATHS[name];

  if (!d) {
    return (
      <span
        style={{ display: 'inline-block', width: size, height: size, ...style }}
        className={className}
      />
    );
  }

  const strokeWidth = weight === 'bold' ? 20 : 16;
  const fill = weight === 'fill' ? color : 'none';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
