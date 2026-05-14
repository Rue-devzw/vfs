import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Valley Farm Secrets',
    short_name: 'VFS',
    description: 'Freshness. Quality. Convenience. Your premier farm-to-table partner supplying fresh produce, groceries, and digital farm solutions.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/images/logo.webp',
        sizes: '192x192',
        type: 'image/webp',
      },
      {
        src: '/images/logo.webp',
        sizes: '512x512',
        type: 'image/webp',
      },
    ],
  }
}
