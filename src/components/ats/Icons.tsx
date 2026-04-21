import React from 'react';

export const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1.5"/><rect x="11" y="2" width="7" height="5" rx="1.5"/>
      <rect x="2" y="12" width="7" height="6" rx="1.5"/><rect x="11" y="9" width="7" height="9" rx="1.5"/>
    </svg>
  ),
  briefcase: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="16" height="12" rx="2"/><path d="M7 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/><line x1="2" y1="11" x2="18" y2="11"/>
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3"/><path d="M1 17v-1a4 4 0 014-4h4a4 4 0 014 4v1"/><circle cx="15" cy="6" r="2.5"/><path d="M15 12c2.2 0 4 1.8 4 4v1"/>
    </svg>
  ),
  building: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="14" height="16" rx="1.5"/>
      <line x1="7" y1="6" x2="7" y2="6.01"/><line x1="10" y1="6" x2="10" y2="6.01"/><line x1="13" y1="6" x2="13" y2="6.01"/>
      <line x1="7" y1="10" x2="7" y2="10.01"/><line x1="10" y1="10" x2="10" y2="10.01"/><line x1="13" y1="10" x2="13" y2="10.01"/>
      <rect x="8" y="14" width="4" height="4"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2M4.2 4.2l1.4 1.4m8.8 8.8l1.4 1.4M1 10h2m14 0h2M4.2 15.8l1.4-1.4m8.8-8.8l1.4-1.4"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="14" y2="14"/><line x1="14" y1="4" x2="4" y2="14"/>
    </svg>
  ),
  mail: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="13" height="9" rx="1.5"/><polyline points="1,3 7.5,8 14,3"/>
    </svg>
  ),
  chat: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 9a1.5 1.5 0 01-1.5 1.5H4L2 13V3.5A1.5 1.5 0 013.5 2h8A1.5 1.5 0 0113 3.5z"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 6.5a4.5 4.5 0 10-9 0c0 5-2.25 6.5-2.25 6.5h13.5s-2.25-1.5-2.25-6.5"/><path d="M7.5 15a1.5 1.5 0 003 0"/>
    </svg>
  ),
  filter: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="1" y1="3" x2="15" y2="3"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="5.5" y1="13" x2="10.5" y2="13"/>
    </svg>
  ),
  link: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 8.5a3 3 0 004.2.3l2-2a3 3 0 00-4.2-4.3l-1.2 1.1"/><path d="M8.5 6.5a3 3 0 00-4.2-.3l-2 2a3 3 0 004.2 4.3l1.1-1.1"/>
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="8,1.5 9.8,5.8 14.5,6.2 11,9.3 12,14 8,11.5 4,14 5,9.3 1.5,6.2 6.2,5.8"/>
    </svg>
  ),
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="13" y1="8" x2="3" y2="8"/><polyline points="7,4 3,8 7,12"/>
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1H3.5A1.5 1.5 0 002 2.5v9A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5V5L8 1z"/><polyline points="8,1 8,5 12,5"/>
    </svg>
  ),
  collapse: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="14" rx="2"/><line x1="2" y1="9" x2="18" y2="9"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="14" y1="2" x2="14" y2="6"/>
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,5 7,9 10,5"/>
    </svg>
  ),
  trending: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,14 7,9 11,12 18,4"/><polyline points="13,4 18,4 18,9"/>
    </svg>
  ),
  dollar: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="2" x2="10" y2="18"/><path d="M14 5H8.5a2.5 2.5 0 000 5h3a2.5 2.5 0 010 5H6"/>
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 1L3 4v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V4l-7-3z"/>
    </svg>
  ),
};
