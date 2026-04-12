module.exports = {
  plugins: [
    require('@csstools/postcss-global-data')({
      files: ['./src/styles/media.css'],  // @custom-mediaをまとめたファイル
    }),
    require('postcss-custom-media'),
    require('postcss-preset-env')({
      features: {
        'cascade-layers': false,
      },
    }),
    require('autoprefixer'),
  ],
};
