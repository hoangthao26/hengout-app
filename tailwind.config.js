/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./modules/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: 'media',
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            fontFamily: {
                'dongle': ['Dongle'],
                'dongle-bold': ['Dongle-Bold'],
                'dongle-light': ['Dongle-Light'],
            },
        },
    },
    plugins: [],
} 