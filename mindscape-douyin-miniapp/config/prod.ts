import type { UserConfigExport } from '@tarojs/cli';

export default {
  mini: {},
  h5: {
    webpackChain(chain) {
      // 内联脚本含 < 比较符，html-minifier 会误解析导致 H5 构建失败
      if (chain.plugins.has('htmlWebpackPlugin')) {
        chain.plugin('htmlWebpackPlugin').tap((args) => {
          const opt = args[0] || {};
          return [{ ...opt, minify: false }];
        });
      }
    },
  },
} satisfies UserConfigExport<'webpack5'>;
