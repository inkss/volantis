/* global hexo */

'use strict';

hexo.on('generateBefore', () => {
  // Merge config.
  require('./lib/config')(hexo);
  require('./lib/stellar-tag-utils')(hexo);
  require('./lib/render-stylus')(hexo);
  require('./lib/check-environment')(hexo);
});

const chalk = require('chalk')
hexo.extend.filter.register('template_locals', function (locals) {
  const all_posts = locals.site.all_posts

  if (!all_posts) {
    hexo.log.debug('failed to get all_posts, is hexo-hide-posts enabled?')
    return
  }

  locals.site.posts = locals.site.all_posts
  hexo.log.debug('current page is ' + chalk.magenta(locals.path))
  hexo.log.debug('set site.posts to all_posts, length is ' + all_posts.length)

  return locals
})
