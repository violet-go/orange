import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#9333ea', // purple
              foreground: '#ffffff',
            },
            secondary: {
              DEFAULT: '#ec4899', // pink
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
} satisfies Config
