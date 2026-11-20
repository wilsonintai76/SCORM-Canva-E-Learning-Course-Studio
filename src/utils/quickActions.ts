import React from 'react';

export type QuickActionCategory = 'Settings' | 'Commands' | 'Tools' | 'Export' | 'Navigation';

export interface QuickActionItem {
  id: string;
  category: QuickActionCategory;
  title: string;
  subtitle?: string;
  keywords?: string[];
  shortcut?: string;
  icon?: React.ReactNode;
  execute: () => void;
}

/**
 * Filters and ranks Quick Actions items by query across title, subtitle, category, and keywords.
 * Prefix and exact title matches are ranked ahead of partial subtitle/keyword matches.
 */
export function filterQuickActions<T extends Pick<QuickActionItem, 'title' | 'subtitle' | 'category' | 'keywords'>>(
  items: T[],
  rawQuery: string
): T[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return items;

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    const title = item.title.toLowerCase();
    const subtitle = (item.subtitle || '').toLowerCase();
    const category = item.category.toLowerCase();
    const keywords = (item.keywords || []).map((k) => k.toLowerCase());

    let score = 0;

    if (title === q) {
      score = 100;
    } else if (title.startsWith(q)) {
      score = 80;
    } else if (title.includes(q)) {
      score = 60;
    } else if (keywords.some((k) => k === q || k.startsWith(q))) {
      score = 50;
    } else if (keywords.some((k) => k.includes(q))) {
      score = 40;
    } else if (category.includes(q)) {
      score = 30;
    } else if (subtitle.includes(q)) {
      score = 20;
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}
