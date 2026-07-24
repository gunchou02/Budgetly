import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Budgetly - 生活費・支出管理',
    short_name: 'Budgetly',
    description: '月間生活費・支出・サブスクをまとめて管理するサービス',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f7f9',
    theme_color: '#111827',
    lang: 'ja',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
