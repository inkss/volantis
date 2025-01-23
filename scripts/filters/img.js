/* global hexo */

'use strict';

hexo.extend.filter.register('after_post_render', function(data) {
  data.content = data.content.replace(/<p><img src="(.*?)" alt="(.*?)"\/><\/p>/g, '<div class="img-wrap"><div class="img-bg"><img class="img" src="$1" alt="$2"\/><\/div><span class="image-caption">$2<\/span><\/div>');
  return data;
});

// scripts/picture-wrapper.js
const cheerio = require('cheerio');
hexo.extend.filter.register('after_render:html', function (htmlContent) {
  if (this.env.cmd !== 'server') return htmlContent;

  const serverConfig = hexo.config.server;

  // 获取服务器的主机地址和端口
  const host = serverConfig.host || 'localhost'; // 默认值为 localhost
  const port = serverConfig.port || 4000; // 默认值为 4000
  const actualHost = host === '0.0.0.0' ? 'localhost' : host;
  const serverUrl = `http://${actualHost}:${port}`;

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

    img.attr('data-src', src);
    img.attr('src', '/img/default/transparent-placeholder-1x1.svg');
    img.attr('loading', 'lazy');

    const picture = $('<picture class="lazy"></picture>');
    img.wrap(picture);
  });

  return $.html();
});
