"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { socialPostsApi } from "@/lib/api";

interface LastPostCardProps {
  primary?: string;
}

export default function LastPostCard({ primary = "oklch(46% 0.108 320)" }: LastPostCardProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  // Fetch latest post from the same source as the content tab
  const postsQ = useQuery({
    queryKey: ["social-posts", "latest"],
    queryFn: () => socialPostsApi.list({ limit: 1 }),
  });

  const post = postsQ.data?.[0];

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n);

  const labels = {
    justPublished: ar ? 'نُشر للتو ✿' : 'just published ✿',
    likes: ar ? 'إعجاب' : 'LIKES',
    comments: ar ? 'تعليق' : 'COMMENTS',
    saves: ar ? 'حفظ' : 'SAVES',
    shares: ar ? 'مشاركة' : 'SHARES',
    imageCaption: ar ? 'منشور · محتوى' : 'post · content',
  };

  if (!post) {
    return (
      <div
        style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.hairline}`,
          borderRadius: 12,
          padding: 14,
          transform: 'rotate(-0.4deg)',
          boxShadow: '0 2px 8px rgba(40,30,30,0.05)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: handFont,
            fontSize: 15,
            color: TOKENS.ink[500],
            textAlign: 'center',
          }}
        >
          {ar ? 'لا توجد منشورات بعد ✿' : 'no posts yet ✿'}
        </div>
      </div>
    );
  }

  // SocialPost has social_accounts joined
  const account = post.social_accounts;
  const isInstagram = account?.provider === 'meta_instagram';
  const color = isInstagram ? TOKENS.ig : TOKENS.fb;
  const handle = account?.handle || account?.display_name || '@account';

  // Calculate time ago
  const postedAt = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
  const now = new Date();
  const diffMs = now.getTime() - postedAt.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let timeAgo: string;
  let timeAgoAr: string;

  if (diffDays > 0) {
    timeAgo = `${diffDays}d ago`;
    timeAgoAr = `منذ ${diffDays} يوم`;
  } else if (diffHours > 0) {
    timeAgo = `${diffHours}h ago`;
    timeAgoAr = `منذ ${diffHours} س`;
  } else {
    timeAgo = 'just now';
    timeAgoAr = 'الآن';
  }

  const metrics = post.latest_metrics;
  const stats = {
    likes: (metrics as any)?.likes ?? (metrics as any)?.like_count ?? 0,
    comments: (metrics as any)?.comments ?? (metrics as any)?.comments_count ?? 0,
    saves: (metrics as any)?.saves ?? 0,
    shares: (metrics as any)?.shares ?? 0,
  };

  const caption = post.caption || (ar ? 'منشور جديد' : 'New post');
  const displayCaption = caption.length > 120 ? caption.substring(0, 120) + '...' : caption;

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 12,
        padding: 14,
        transform: 'rotate(-0.4deg)',
        boxShadow: '0 2px 8px rgba(40,30,30,0.05)',
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Rotated "just published" sticker */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          [ar ? 'left' : 'right']: -8,
          transform: `rotate(${ar ? '-8deg' : '8deg'})`,
          background: 'oklch(94% 0.030 60)',
          border: '1px dashed oklch(50% 0.130 60)',
          padding: '3px 9px',
          borderRadius: 4,
          fontFamily: handFont,
          fontSize: 13,
          color: 'oklch(38% 0.110 60)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          zIndex: 2,
        }}
      >
        {labels.justPublished}
      </div>

      {/* Post image or gradient placeholder */}
      <div
        style={{
          height: 280,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          background: post.media_url
            ? `url(${post.media_url}) center/cover`
            : `
              radial-gradient(circle at 30% 40%, oklch(80% 0.090 60) 0%, transparent 50%),
              radial-gradient(circle at 75% 65%, oklch(78% 0.080 320) 0%, transparent 55%),
              linear-gradient(135deg, oklch(94% 0.030 40), oklch(92% 0.024 80))`,
        }}
      >
        {post.media_url ? (
          <img
            src={post.media_url}
            alt={post.caption || 'Post image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              // Fallback to gradient if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.04) 6px 7px)',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            [ar ? 'right' : 'left']: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: post.media_url ? 'rgba(255,255,255,0.95)' : 'oklch(40% 0.090 50)',
            background: post.media_url ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
            padding: '2px 7px',
            borderRadius: 3,
            backdropFilter: post.media_url ? 'blur(4px)' : 'none',
          }}
        >
          {labels.imageCaption}
        </div>
      </div>

      {/* Header row: platform badge · handle · time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexDirection: ar ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: color + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Newsreader, serif',
            color,
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          {isInstagram ? 'IG' : 'FB'}
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TOKENS.ink[900],
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {handle}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10,
            color: TOKENS.ink[500],
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {ar ? timeAgoAr : timeAgo}
        </span>
      </div>

      {/* Body — handwritten Caveat/Kalam */}
      <div
        style={{
          fontFamily: handFont,
          fontSize: ar ? 13 : 13.5,
          lineHeight: 1.25,
          color: TOKENS.ink[800],
          textAlign: ar ? 'right' : 'left',
        }}
      >
        {displayCaption}
      </div>

      {/* Stats list — 2x2 grid (divider above is dashed) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          paddingTop: 6,
          borderTop: `1px dashed ${TOKENS.hairline}`,
        }}
      >
        {[
          [labels.likes, stats.likes],
          [labels.comments, stats.comments],
          [labels.saves, stats.saves],
          [labels.shares, stats.shares],
        ].map(([k, v], i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <span
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 11,
                fontWeight: 600,
                color: TOKENS.ink[900],
                letterSpacing: '-0.01em',
              }}
            >
              {fmt(v as number)}
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 7.5,
                color: TOKENS.ink[500],
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {k}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
