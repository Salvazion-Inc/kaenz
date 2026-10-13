import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function loadDotEnvLocal(): void {
  const p = join(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  try {
    const text = readFileSync(p, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

loadDotEnvLocal();

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://kaenz.com'
).replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'com.kaenz.app',
  appName: 'Kaenz',
  webDir: 'native/www',
  server: {
    url: serverUrl.endsWith('/app') ? serverUrl : `${serverUrl}/app`,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'kaenz.com',
      '*.kaenz.com',
      '*.stripe.com',
      'accounts.google.com',
      '*.supabase.co',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#050a30',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050a30',
    },
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
