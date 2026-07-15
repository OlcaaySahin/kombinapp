/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind zorunlu kılıyor: native'de medya sorgusu (prefers-color-scheme) yok, bu yüzden
  // dark mode'u kendi runtime'ı (useColorScheme ile senkron) yönetiyor — 'media' bırakılırsa
  // web'de "Cannot manually set color scheme" hatasıyla çöküyor.
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins_600SemiBold'],
        'heading-bold': ['Poppins_700Bold'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
        'body-semibold': ['Inter_600SemiBold'],
      },
      colors: {
        primary: {
          DEFAULT: '#3461FD',
          light: '#6B8AFE',
          dark: '#1E3FCC',
        },
        accent: {
          purple: '#8B3FE8',
          mustard: '#E8B923',
          coral: '#FF4757',
        },
      },
    },
  },
  plugins: [],
};
