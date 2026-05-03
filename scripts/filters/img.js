/* global hexo */

'use strict';

// 将 standalone <p><img></p> 包裹为 .img-wrap 容器
hexo.extend.filter.register('after_post_render', function (data) {
  data.content = data.content.replace(/<p><img src="(.*?)" alt="(.*?)"\/><\/p>/g, '<div class="img-wrap"><div class="img-bg"><img class="img" src="$1" alt="$2"\/><\/div><span class="image-caption">$2<\/span><\/div>');
  return data;
});

const cheerio = require('cheerio');

// 本地开发服务器：为图片添加懒加载 <picture> 包裹
hexo.extend.filter.register('after_render:html', function (htmlContent) {
  if (this.env.cmd !== 'server') return htmlContent;

  const serverConfig = hexo.config.server;
  const host = serverConfig.host || 'localhost';
  const port = serverConfig.port || 4000;
  const actualHost = host === '0.0.0.0' ? 'localhost' : host;
  // cnb 环境下图片路径已在 hexo-deployer-tencent 中处理，此处不拼接服务器地址
  const serverUrl = hexo.config.cnb ? "" : `http://${actualHost}:${port}`;
  const $ = cheerio.load(htmlContent);

  $('img').each(function () {
    const img = $(this);

    let src = decodeURIComponent(img.attr('src'));
    if (src && src.startsWith('../../')) {
      src = src.replace('../../', `${serverUrl}/`);
      img.attr('src', decodeURIComponent(src));
    } else if (src && src.startsWith('/img/')) {
      src = src.replace('/img/', `${serverUrl}/img/`);
      img.attr('src', decodeURIComponent(src));
    }

    const picture = $('<picture class="lazy"></picture>');
    img.wrap(picture);

    img.attr('data-src', src);
    img.attr('src', '/img/default/transparent-placeholder-1x1.svg');
    img.attr('loading', 'lazy');
  });

  return $.html();
});
