import type { UserConfigExport } from '@tarojs/cli';
import webpack from 'webpack';

/** 单文件 Demo：合并 JS/CSS 为单 chunk，便于 scripts/pack-demo-single-html.mjs 内联 */
export default {
  mini: {},
  h5: {
    output: {
      filename: 'js/[name].js',
      chunkFilename: 'js/[name].js',
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
      filename: 'css/[name].css',
      chunkFilename: 'css/[name].css',
    },
    webpackChain(chain) {
      chain.optimization.splitChunks({
        chunks: 'all',
        minSize: 0,
        cacheGroups: {
          default: {
            name: 'bundle',
            chunks: 'all',
            enforce: true,
            priority: 10,
          },
          vendors: false,
          common: false,
        },
      });
      chain.optimization.runtimeChunk(false);
      if (chain.plugins.has('htmlWebpackPlugin')) {
        chain.plugin('htmlWebpackPlugin').tap((args) => {
          const opt = args[0] || {};
          return [{ ...opt, minify: false }];
        });
      }
      chain.plugin('limit-chunks').use(webpack.optimize.LimitChunkCountPlugin, [{ maxChunks: 3 }]);
    },
  },
} satisfies UserConfigExport<'webpack5'>;
