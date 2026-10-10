module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      backgroundImage: {
        ig: 'linear-gradient(45deg,#f9ce34,#ee2a7b 55%,#6228d7)',
      },
    },
  },
  plugins: [],
};
