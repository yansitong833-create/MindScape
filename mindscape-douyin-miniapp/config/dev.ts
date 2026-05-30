import type { UserConfigExport } from '@tarojs/cli';
export default {
  defineConstants: {
    PARTICLE_CLOUD_DEV_MODE: 'true',
  },
  logger: {
    quiet: false,
    stats: true,
  },
  mini: {},
  h5: {
    devServer: {
      open: false, //禁止自动打开浏览器
    },
  },
} satisfies UserConfigExport<'webpack5'>;
