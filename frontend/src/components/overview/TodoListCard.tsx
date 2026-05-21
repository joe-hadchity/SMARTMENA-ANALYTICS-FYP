"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS, type PastelColor } from "@/lib/design-tokens";
import { scheduledPostsApi } from "@/lib/api";
import { gregorianToHijri } from "@/lib/hijri";

interface TodoItem {
  id: string;
  text: string;
  textAr: string;
  done: boolean;
  moved?: boolean;
  pastel: PastelColor;
  day: 'today' | 'tomorrow';
  source: 'manual' | 'scheduled' | 'holiday';
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const PASTEL_COLORS: PastelColor[] = ['blush', 'lavender', 'babyblue', 'mint', 'cream'];

const STORAGE_KEY = 'smartmena.todos';

// MENA holidays and observances (Hijri dates - approximate Gregorian for 2026)
const MENA_EVENTS_2026 = [
  { hijri: '1-1', greg: new Date('2026-06-17'), name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', days: 7 },
  { hijri: '3-12', greg: new Date('2026-08-25'), name: 'Mawlid al-Nabi', nameAr: 'المولد النبوي', days: 7 },
  { hijri: '9-1', greg: new Date('2027-02-28'), name: 'Ramadan begins', nameAr: 'بداية رمضان', days: 14 },
  { hijri: '10-1', greg: new Date('2027-03-30'), name: 'Eid al-Fitr', nameAr: 'عيد الفطر', days: 7 },
  { hijri: '12-10', greg: new Date('2027-06-07'), name: 'Eid al-Adha', nameAr: 'عيد الأضحى', days: 7 },
];

function loadTodos(): TodoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // ignore
  }
}

export default function TodoListCard({ primary = "oklch(46% 0.108 320)" }: { primary?: string }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  const [currentDay, setCurrentDay] = useState<'today' | 'tomorrow'>('today');
  const [items, setItems] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch scheduled posts
  const scheduledQ = useQuery({
    queryKey: ["scheduled-posts", "upcoming"],
    queryFn: () => scheduledPostsApi.list({ status: "scheduled", limit: 10 }),
  });

  // Load todos from localStorage on mount
  useEffect(() => {
    setItems(loadTodos());
    setIsLoaded(true);
  }, []);

  // Auto-generate tasks from scheduled posts and holidays
  useEffect(() => {
    if (!isLoaded || !scheduledQ.data) return;

    const scheduled = scheduledQ.data ?? [];
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const autoTasks: TodoItem[] = [];
    // Start pastel index from current items count to ensure rotation
    let pastelIndex = items.length;

    // Generate tasks from scheduled posts (today & tomorrow)
    scheduled.forEach(post => {
      const scheduledDate = new Date(post.scheduled_at);
      let day: 'today' | 'tomorrow' | null = null;

      if (scheduledDate <= todayEnd) day = 'today';
      else if (scheduledDate <= tomorrowEnd) day = 'tomorrow';

      if (day) {
        const time = scheduledDate.toLocaleTimeString(ar ? 'ar-SA' : 'en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const platform = post.platform === 'meta_instagram' ? 'Instagram' :
                         post.platform === 'meta_facebook' ? 'Facebook' :
                         post.platform.replace('_', ' ');
        const taskId = `scheduled-${post.id}`;

        // Check if this task already exists
        if (!items.find(t => t.id === taskId)) {
          autoTasks.push({
            id: taskId,
            text: `Review & publish ${platform} post at ${time}`,
            textAr: `مراجعة ونشر منشور ${platform} الساعة ${time}`,
            done: false,
            pastel: PASTEL_COLORS[pastelIndex++ % PASTEL_COLORS.length],
            day,
            source: 'scheduled',
          });
        }
      }
    });

    // Generate tasks from upcoming MENA holidays (within next 14 days)
    MENA_EVENTS_2026.forEach(event => {
      const daysUntil = Math.floor((event.greg.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= 0 && daysUntil <= event.days) {
        const taskId = `holiday-${event.hijri}`;

        // Check if this task already exists
        if (!items.find(t => t.id === taskId)) {
          const day: 'today' | 'tomorrow' = daysUntil <= 1 ? (daysUntil === 0 ? 'today' : 'tomorrow') : 'today';
          autoTasks.push({
            id: taskId,
            text: `Prepare content for ${event.name} (${daysUntil}d)`,
            textAr: `تحضير محتوى لـ ${event.nameAr} (${daysUntil} يوم)`,
            done: false,
            pastel: PASTEL_COLORS[pastelIndex++ % PASTEL_COLORS.length],
            day,
            source: 'holiday',
          });
        }
      }
    });

    // Add auto-generated tasks if any
    if (autoTasks.length > 0) {
      setItems(prev => {
        const combined = [...prev, ...autoTasks];
        saveTodos(combined);
        return combined;
      });
    }
  }, [isLoaded, scheduledQ.data, items, ar]);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isLoaded) {
      saveTodos(items);
    }
  }, [items, isLoaded]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const months = ar ? MONTHS_AR : MONTHS_EN;
  const displayDate = currentDay === 'today' ? today : tomorrow;
  const greg = `${displayDate.getDate()} ${months[displayDate.getMonth()]} ${displayDate.getFullYear()}`;

  function toggleDone(id: string) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function moveTomorrow(id: string) {
    setItems(prev => prev.map(t =>
      t.id === id ? { ...t, day: t.day === 'today' ? 'tomorrow' : 'today', moved: true } : t
    ));
  }

  function deleteTask(id: string) {
    setItems(prev => prev.filter(t => t.id !== id));
  }

  function addTask() {
    if (!newTaskText.trim()) return;

    const newTask: TodoItem = {
      id: `manual-${Date.now()}`,
      text: newTaskText,
      textAr: newTaskText,
      done: false,
      pastel: PASTEL_COLORS[items.length % PASTEL_COLORS.length],
      day: currentDay,
      source: 'manual',
    };

    setItems(prev => [...prev, newTask]);
    setNewTaskText("");
  }

  const displayItems = items.filter(t => t.day === currentDay);
  const completedCount = displayItems.filter(t => t.done).length;

  const todoTitle = ar ? 'مهام اليوم' : currentDay === 'today' ? "today's to-do" : "tomorrow's to-do";
  const todoSub = ar ? 'مكتب المحلّل · ' : 'analyst desk · ';
  const moveTomorrowText = ar ? '→ غداً' : '→ tomorrow';
  const moveTodayText = ar ? '→ اليوم' : '→ today';
  const movedText = ar ? '↻ تم النقل' : '↻ moved';
  const cavetatSubtext = ar ? 'لا تنسى رشفة قهوة بين المهام ✿' : "don't forget a sip of coffee between tasks ✿";
  const addTaskPlaceholder = ar ? '+ إضافة مهمة' : '+ add task';

  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 12,
        padding: '18px 22px 22px',
        position: 'relative',
        clipPath: 'polygon(0 8px, 3% 4px, 7% 10px, 12% 3px, 18% 8px, 24% 2px, 32% 9px, 40% 4px, 48% 10px, 56% 3px, 64% 9px, 72% 5px, 80% 10px, 88% 4px, 94% 9px, 100% 6px, 100% 100%, 0 100%)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 14px rgba(40,30,30,0.05)',
      }}
    >
      {/* tape strip */}
      <div
        style={{
          position: 'absolute',
          top: -4,
          [ar ? 'right' : 'left']: '50%',
          transform: 'translateX(-50%) rotate(-1.5deg)',
          width: 70,
          height: 16,
          background: 'oklch(92% 0.024 80 / 0.85)',
          border: '1px solid oklch(82% 0.040 80 / 0.6)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexDirection: ar ? 'row-reverse' : 'row',
          marginBottom: 12,
        }}
      >
        <div style={{ textAlign: ar ? 'right' : 'left', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: ar ? 'row-reverse' : 'row' }}>
            <h3
              style={{
                fontFamily: handFont,
                fontWeight: 500,
                fontSize: 28,
                color: 'oklch(38% 0.094 320)',
                lineHeight: 1,
              }}
            >
              {todoTitle}
            </h3>
            {/* Day navigation arrows */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setCurrentDay('today')}
                disabled={currentDay === 'today'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: currentDay === 'today' ? 'default' : 'pointer',
                  fontSize: 16,
                  color: currentDay === 'today' ? TOKENS.ink[300] : primary,
                  padding: '2px 4px',
                  opacity: currentDay === 'today' ? 0.5 : 1,
                }}
                aria-label="Today"
              >
                {ar ? '→' : '←'}
              </button>
              <button
                onClick={() => setCurrentDay('tomorrow')}
                disabled={currentDay === 'tomorrow'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: currentDay === 'tomorrow' ? 'default' : 'pointer',
                  fontSize: 16,
                  color: currentDay === 'tomorrow' ? TOKENS.ink[300] : primary,
                  padding: '2px 4px',
                  opacity: currentDay === 'tomorrow' ? 0.5 : 1,
                }}
                aria-label="Tomorrow"
              >
                {ar ? '←' : '→'}
              </button>
            </div>
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9.5,
              color: TOKENS.ink[500],
              letterSpacing: '0.08em',
              marginTop: 5,
            }}
          >
            {todoSub}{greg}
          </div>
        </div>
        <div
          style={{
            fontFamily: 'Newsreader, serif',
            fontSize: 24,
            fontWeight: 500,
            color: 'oklch(46% 0.108 320)',
          }}
        >
          {completedCount}
          <span style={{ color: TOKENS.ink[400] }}>/{displayItems.length}</span>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto' }}>
        {displayItems.map((t, i) => {
          const text = ar ? t.textAr : t.text;
          const rot = ((i % 2 === 0) ? -0.4 : 0.4) + (i * 0.05 - 0.15);
          return (
            <div
              key={t.id}
              style={{
                background: TOKENS.pastel[t.pastel],
                border: '1px solid rgba(0,0,0,0.04)',
                borderRadius: 7,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexDirection: ar ? 'row-reverse' : 'row',
                transform: `rotate(${rot}deg)`,
                boxShadow: '0 1px 4px rgba(40,30,30,0.06), 0 0 0 1px rgba(255,255,255,0.4) inset',
                opacity: t.done ? 0.6 : 1,
                transition: 'opacity 180ms',
              }}
            >
              {/* Hand-drawn checkbox */}
              <button
                onClick={() => toggleDone(t.id)}
                style={{
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={t.done ? "Mark as incomplete" : "Mark as complete"}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path
                    d="M2 3 Q3 2 5 3 L17 3 Q19 2.5 18 4 L18 16 Q19 18 17 17 L4 17 Q1.5 17.5 2.5 16 Z"
                    fill="rgba(255,255,255,0.5)"
                    stroke={TOKENS.ink[700]}
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  {t.done && (
                    <path
                      d="M4.5 10.5 L8.5 14 L16 5.5"
                      fill="none"
                      stroke={primary}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
              <span
                style={{
                  flex: 1,
                  fontFamily: ar
                    ? "'IBM Plex Sans Arabic', sans-serif"
                    : "'IBM Plex Sans', sans-serif",
                  fontSize: 12.5,
                  color: TOKENS.ink[800],
                  textDecoration: t.done ? 'line-through' : 'none',
                  textDecorationStyle: 'wavy',
                  textDecorationColor: 'rgba(0,0,0,0.3)',
                  textAlign: ar ? 'right' : 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {text}
                {/* Show icon for auto-generated tasks */}
                {t.source === 'scheduled' && (
                  <span style={{ fontSize: 10 }} title={ar ? 'من الجدول' : 'From schedule'}>📅</span>
                )}
                {t.source === 'holiday' && (
                  <span style={{ fontSize: 10 }} title={ar ? 'مناسبة' : 'Holiday event'}>🌙</span>
                )}
              </span>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {/* Delete button (only for manual tasks) */}
                {t.source === 'manual' && (
                  <button
                    onClick={() => deleteTask(t.id)}
                    style={{
                      fontFamily: handFont,
                      fontSize: 16,
                      color: 'oklch(50% 0.150 25)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      opacity: 0.6,
                    }}
                    aria-label="Delete task"
                    title={ar ? 'حذف' : 'Delete'}
                  >
                    ×
                  </button>
                )}
                <button
                  onClick={() => moveTomorrow(t.id)}
                  style={{
                    fontFamily: handFont,
                    fontSize: 13,
                    color: t.moved ? 'oklch(40% 0.090 150)' : 'oklch(46% 0.108 320)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                  aria-label={currentDay === 'today' ? "Move to tomorrow" : "Move to today"}
                >
                  {t.moved ? movedText : (currentDay === 'today' ? moveTomorrowText : moveTodayText)}
                </button>
              </div>
            </div>
          );
        })}

        {/* Add task input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexDirection: ar ? 'row-reverse' : 'row',
          }}
        >
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addTask();
              }
            }}
            placeholder={addTaskPlaceholder}
            style={{
              flex: 1,
              fontFamily: ar
                ? "'IBM Plex Sans Arabic', sans-serif"
                : "'IBM Plex Sans', sans-serif",
              fontSize: 12.5,
              color: TOKENS.ink[800],
              background: 'oklch(98% 0.010 80 / 0.5)',
              border: '1px dashed oklch(84% 0.030 80)',
              borderRadius: 7,
              padding: '8px 12px',
              outline: 'none',
            }}
          />
          <button
            onClick={addTask}
            disabled={!newTaskText.trim()}
            style={{
              fontFamily: handFont,
              fontSize: 18,
              color: newTaskText.trim() ? primary : TOKENS.ink[400],
              background: 'transparent',
              border: 'none',
              cursor: newTaskText.trim() ? 'pointer' : 'default',
              padding: '4px 8px',
            }}
            aria-label="Add task"
          >
            +
          </button>
        </div>
      </div>

      {/* Caveat subtext */}
      <div
        style={{
          marginTop: 14,
          fontFamily: handFont,
          fontSize: 15,
          color: 'oklch(50% 0.013 50)',
          textAlign: ar ? 'right' : 'left',
          transform: 'rotate(-0.6deg)',
        }}
      >
        {cavetatSubtext}
      </div>
    </div>
  );
}
