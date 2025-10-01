import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'glass': {
          'dark': 'rgba(0, 0, 0, 0.4)',
          'light': 'rgba(255, 255, 255, 0.1)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        'gradient-aurora': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 50%, #d299c2 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 10px 40px 0 rgba(31, 38, 135, 0.5)',
        'glow': '0 0 20px rgba(147, 51, 234, 0.5)',
        'glow-lg': '0 0 40px rgba(147, 51, 234, 0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#7c3aed', // violet-600
              foreground: '#ffffff',
            },
            secondary: {
              DEFAULT: '#ec4899', // pink-500
              foreground: '#ffffff',
            },
            background: '#fafafa',
            foreground: '#1a1a1a',
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: '#a78bfa', // violet-400
              foreground: '#000000',
            },
            secondary: {
              DEFAULT: '#f472b6', // pink-400
              foreground: '#000000',
            },
            background: '#0a0a0a',
            foreground: '#fafafa',
          },
        },
      },
    }),
  ],
} satisfies Config
