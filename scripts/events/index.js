/* global hexo */

'use strict';

hexo.on('generateBefore', () => {
  // Merge config.
  require('./lib/config')(hexo);
  require('./lib/stellar-tag-utils')(hexo);
  require('./lib/render-stylus')(hexo);

});

