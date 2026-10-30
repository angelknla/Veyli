import type { MetadataRoute } from 'next';

const manifest = (): MetadataRoute.Manifest => {
  return {
    id: '/',
    name: 'Veyli',
    short_name: 'Veyli',
    description: 'Press play. Prove it. Daily movie, TV and gaming challenges.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#090909',
    theme_color: '#090909',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
};

export default manifest;
