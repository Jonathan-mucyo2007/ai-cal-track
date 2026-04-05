/**
 * Global Color System
 * Single source of truth for the application's entire color palette.
 * Supports light and dark modes dynamically.
 */

const tintColorLight = '#29BF50';
const tintColorDark = '#29BF50';

export const Colors = {
  light: {
    primary: '#29BF50',
    primaryLight: '#4CEB75',
    primaryDark: '#1E8F3B',
    accent: '#00F5D4',        // Electric Teal
    accentPurple: '#6B46C1',  // Deep Purple
    text: '#111827',         
    textSecondary: '#6B7280', 
    background: '#F9FAFB',    
    surface: '#FFFFFF',       
    surfaceBorder: '#E5E7EB', 
    border: '#D1D5DB',        
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    blobStart: 'rgba(41, 191, 80, 0.12)', 
    blobEnd: 'rgba(16, 185, 129, 0.12)',  
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
  },
  dark: {
    primary: '#29BF50',
    primaryLight: '#4CEB75',
    primaryDark: '#1E8F3B',
    accent: '#00F5D4',        // Electric Teal
    accentPurple: '#6B46C1',  // Deep Purple
    text: '#F9FAFB',         
    textSecondary: '#9CA3AF', 
    background: '#0F172A',    
    surface: '#1E293B',       
    surfaceBorder: '#334155', 
    border: '#475569',        
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    blobStart: 'rgba(41, 191, 80, 0.18)', 
    blobEnd: 'rgba(56, 189, 248, 0.12)',  
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
  },
};
