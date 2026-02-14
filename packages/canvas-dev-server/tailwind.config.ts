import type { Config } from 'tailwindcss';
import tw_typography from '@tailwindcss/typography'

const config = {
    darkMode: 'class',
    content: [
        './src/**/*.{html,js,svelte,ts}'
    ],
    theme: {
        extend: {},
    },
    plugins: [
        tw_typography
    ]
} satisfies Config;

export default config;
