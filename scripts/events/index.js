/* global hexo */

'use strict';

hexo.on('generateBefore', () => {
  // Merge config.
  require('./lib/config')(hexo);
  require('./lib/stellar-tag-utils')(hexo);
  require('./lib/render-stylus')(hexo);
  if (hexo.theme.config.debug === "env") {
    require('./lib/check-environment')(hexo);
  }
});

hexo.on('ready', () => {
  const { version } = require('../../package.json');
  hexo.log.info(`
============================================================
  Volantis ${version}
  Docs: https://volantis.js.org/
  Repo: https://github.com/volantis-x/hexo-theme-volantis/
============================================================`);
});

// 测试样式
// hexo.extend.filter.register('after_render:html', function (data) {
//   // 匹配所有包含 src 属性的 img 标签
//   const regex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/g;
//   let result;
//   while ((result = regex.exec(data)) !== null) {
//     const originalSrc = result[1];
//     const newSrc = '/img/default/loading.svg';
//     data = data.replace(originalSrc, newSrc);
//   }
//   return data;
// });

