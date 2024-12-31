'use strict';

function postBtns(args, content) {
  return `<div class="btns ${args.join(' ')}">
            ${content}
          </div>`;
}

function postCell(args, content) {
  if(/::/g.test(args)){
    args = args.join(' ').split('::');
  }
  else{
    args = args.join(' ').split(',');
  }
  let text = args[0] || '';
  let url = args[1] || '';
  text = text.trim();
  url = url.trim();
  if (url.length > 0) {
    url = 'href=\'' + url + '\'';
  }
  let icon = '';
  let img = hexo.theme.config.tag_plugins.link.placeholder;
  if (args.length > 2) {
    if (args[2].includes('fa-') || args[2].includes('feather')) {
      return `<a class="button" ${url} title='${text}'><i class='${args[2].trim()}'></i>${text}</a>`;
    } else if(args[2].trim() != ''){
      img = args[2].trim() ;
    }
  }
  return `<a class="button" ${url} title='${text}'><img src='${img}'></img>${text}</a>`;
}

hexo.extend.tag.register('btns', postBtns, {ends: true});
hexo.extend.tag.register('cell', postCell);
