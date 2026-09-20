/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Échelles de marque « Terra » ─────────────────────────── */

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

        /* Brun espresso — fonds sombres, actions secondaires */
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

        /* Vert kente — succès, positif */
        kente: {
          green: '#2F6B45',
          red: '#A63A2B',
        },

        /* ── Remapping sémantique du CRM ────────────────────────────
           Les modules utilisent les couleurs Tailwind standard.
           On les redirige vers la palette « Terra » afin d'habiller
           toute l'application SANS toucher au code des modules.
           (blue → terre cuite, gray → gris chauds, purple/indigo →
           bronze espresso, green/emerald/teal → vert kente,
           amber/orange/yellow → or, red → rouge brique)            */

        blue: {
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

        gray: {
          50: '#FAF9F7',
          100: '#F4F2EF',
          200: '#E8E4DE',
          300: '#D5CFC6',
          400: '#A9A29A',
          500: '#7A7269',
          600: '#5C554C',
          700: '#453F38',
          800: '#2B2723',
          900: '#1E1B17',
          950: '#100E0B',
        },

        green: {
          50: '#F2F7F4',
          100: '#E2EEE6',
          200: '#C5DDCF',
          300: '#9CC4AB',
          400: '#6BA584',
          500: '#4A8A67',
          600: '#2F6B45',
          700: '#27573A',
          800: '#22462F',
          900: '#1D3A28',
          950: '#0F2015',
        },

        emerald: {
          50: '#F2F7F4',
          100: '#E2EEE6',
          200: '#C5DDCF',
          300: '#9CC4AB',
          400: '#6BA584',
          500: '#4A8A67',
          600: '#2F6B45',
          700: '#27573A',
          800: '#22462F',
          900: '#1D3A28',
          950: '#0F2015',
        },

        teal: {
          50: '#F2F7F4',
          100: '#E2EEE6',
          200: '#C5DDCF',
          300: '#9CC4AB',
          400: '#6BA584',
          500: '#4A8A67',
          600: '#2F6B45',
          700: '#27573A',
          800: '#22462F',
          900: '#1D3A28',
          950: '#0F2015',
        },

        purple: {
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

        indigo: {
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

        amber: {
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

        orange: {
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

        yellow: {
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

        pink: {
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

        red: {
          50: '#FDF3F2',
          100: '#FBE4E1',
          200: '#F6C7C1',
          300: '#EFA097',
          400: '#E57367',
          500: '#D95245',
          600: '#C0362B',
          700: '#A02D24',
          800: '#832722',
          900: '#6C241F',
          950: '#3B100E',
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
