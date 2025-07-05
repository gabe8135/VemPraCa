/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ["./src/**/*.{js,jsx,ts,tsx}","./app/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
        playfair: ['"Playfair_Display"', 'serif'],
        abril: ['"Abril Fatface"', 'serif'],
        vibes: ['"Great Vibes"', 'cursive'],
        dancing: ['"Dancing Script"', 'cursive'],
        montserrat: ['"Montserrat"', 'sans-serif'],
    },
            colors: {
                gold: "#FFD700",
            },
        
        },
    },
    plugins: [],
};
