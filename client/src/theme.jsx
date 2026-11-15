import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// The head script sets the same attribute before React and CSS paint.
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme || 'light');
    window.addEventListener('bunavat-theme', sync);
    const syncStorage = (e) => { if (e.key === 'bunavat-theme' && (e.newValue === 'light' || e.newValue === 'dark')) { document.documentElement.dataset.theme = e.newValue; sync(); } };
    window.addEventListener('storage', syncStorage);
    return () => { window.removeEventListener('bunavat-theme', sync); window.removeEventListener('storage', syncStorage); };
  }, []);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('bunavat-theme', next); } catch {}
    window.dispatchEvent(new Event('bunavat-theme'));
  }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>;
}
