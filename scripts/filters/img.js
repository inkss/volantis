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

  const $ = cheerio.load(htmlContent);

  $('img').each(function () {
    const img = $(this);
    img.attr('data-src', img.attr('src'));
    img.attr('src', '/img/default/transparent-placeholder-1x1.svg');
    img.attr('loading', 'lazy');

    const picture = $('<picture class="lazy"></picture>');
    img.wrap(picture);
  });

  return $.html();
});
