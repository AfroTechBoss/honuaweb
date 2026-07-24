"use client";
import React from "react";

// Tiny inline icons (lucide-style) — ported verbatim from the prototype.
export function Icon({ name, size = 18, stroke = 1.75, color = "currentColor", fill = "none" }: any) {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
    compass: <><circle cx="12" cy="12" r="9" /><path d="M16 8l-2 6-6 2 2-6z" /></>,
    bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8a3 3 0 016 0" /></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3z" />,
    bell: <><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 004 0" /></>,
    msg: <path d="M3 5h18v12H7l-4 4V5z" />,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 19c0-2 2-3.5 4-3.5" /></>,
    check: <path d="M4 12l5 5L20 6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.3l2-1.6-2-3.4-2.4.9a7 7 0 00-2.3-1.3L13.5 3h-3l-.7 2.3a7 7 0 00-2.3 1.3l-2.4-.9-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .9.1 1.3l-2 1.6 2 3.4 2.4-.9a7 7 0 002.3 1.3l.7 2.3h3l.7-2.3a7 7 0 002.3-1.3l2.4.9 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
    heart: <path d="M12 21s-7-5-9-10a5 5 0 019-3 5 5 0 019 3c-2 5-9 10-9 10z" />,
    comment: <path d="M3 5h18v12H7l-4 4V5z" />,
    repost: <><path d="M17 2l4 4-4 4" /><path d="M21 6H7a4 4 0 00-4 4v2" /><path d="M7 22l-4-4 4-4" /><path d="M3 18h14a4 4 0 004-4v-2" /></>,
    share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 11l8-4M8 13l8 4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    map: <><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" /><path d="M9 3v15M15 6v15" /></>,
    leaf: <><path d="M21 3c0 9-7 14-12 14-2 0-4-1-5-2 0-9 6-14 12-14 2 0 4 1 5 2z" /><path d="M4 21c2-7 5-10 12-12" /></>,
    flame: <path d="M12 3s4 3 4 8a4 4 0 01-8 0c0-2 2-3 2-5 0 4 4 3 4 8a4 4 0 11-8 0c0-5 6-11 6-11z" />,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" /></>,
    bolt: <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />,
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    plant: <><path d="M12 22V10" /><path d="M12 10c0-4-3-7-7-7 0 4 3 7 7 7z" /><path d="M12 10c0-4 3-7 7-7 0 4-3 7-7 7z" /></>,
    droplet: <path d="M12 3s7 7 7 12a7 7 0 01-14 0c0-5 7-12 7-12z" />,
    co2: null,
    chevron: <path d="M9 6l6 6-6 6" />,
    close: <path d="M6 6l12 12M6 18L18 6" />,
    more: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
    pin: <><circle cx="12" cy="10" r="3" /><path d="M12 22s7-8 7-13a7 7 0 10-14 0c0 5 7 13 7 13z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>,
    award: <><circle cx="12" cy="9" r="6" /><path d="M8 14l-2 7 6-3 6 3-2-7" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
    pencil: <><path d="M4 20h4l11-11-4-4L4 16v4z" /><path d="M14 5l4 4" /></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M3 13h18M12 9v12M12 9S10 3 7.5 4.5 12 9 12 9zM12 9s2-6 4.5-4.5S12 9 12 9z" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    wifiOff: <><path d="M2 8a16 16 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01M2 2l20 20" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    edit: <><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    star: <path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.5 9.9 9 9z" />,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    minus: <path d="M5 12h14" />,
    cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.5 13h11l2-9H6" /></>,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5a2.5 2 0 015 0c0 1.5-2.5 1.5-2.5 2.5s2.5 1 2.5 2.5a2.5 2 0 01-5 0" /></>,
    package: <><path d="M21 8V20a1 1 0 01-1 1H4a1 1 0 01-1-1V8" /><path d="M23 3H1v5h22V3zM10 12h4" /></>,
    truck: <><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 4v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
    bars: <path d="M3 6h18M3 12h18M3 18h18" />,
    tag: <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01" />,
    at: <><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.home}
    </svg>
  );
}
