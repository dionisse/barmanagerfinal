/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Terre cuite — couleur principale */
        clay: {
          50: '#FCF4ED',
          100: '#F8E4D5',
          200: '#F0C5A6',
          300: '#E79F71',
          400: '#DB7A45',
          500: '#C25E1E',
          600: '#B04E17',
          700: '#8F3F16',
          800: '#723417',
          900: '#5C2C16',
          950: '#311509',
        },
        /* Or du soleil — accent */
        gold: {
          50: '#FDF8EA',
          100: '#F9EEC7',
          200: '#F2DC8D',
          300: '#EBC553',
          400: '#E5AF2E',
          500: '#D4951C',
          600: '#B87417',
          700: '#935516',
          800: '#794417',
          900: '#653818',
          950: '#3B1D0A',
        },
        /* Brun espresso — fonds sombres, textes */
        espresso: {
          50: '#F6F2ED',
          100: '#EAE1D4',
          200: '#D5C1A9',
          300: '#BB9C7B',
          400: '#9E7A58',
          500: '#82613F',
          600: '#674A32',
          700: '#4E3826',
          800: '#36251A',
          900: '#241711',
          950: '#180F0B',
        },
        /* Ivoire / sable — fonds clairs */
        cream: {
          50: '#FDFAF4',
          100: '#FAF4E9',
          200: '#F3E9D6',
          300: '#EADDC3',
        },
        /* Couleurs kente */
        kente: {
          green: '#2F6B45',
          red: '#A63A2B',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 40px -12px rgba(36, 23, 17, 0.15)',
        lift: '0 24px 70px -20px rgba(36, 23, 17, 0.35)',
        warm: '0 10px 30px -10px rgba(176, 78, 23, 0.45)',
      },
    },
  },
  plugins: [],
};
