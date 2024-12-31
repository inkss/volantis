/**
 * note.js | https://github.com/volantis-x/hexo-theme-volantis
 */

'use strict';

function rFeather(name) {
  if (name == '') {
    return 'chevron-right';
  }
  if (name.includes('quote')) {
    return name.replace('quote', 'chevron-right')
  }
  //warning to alert-circle
  if (name.includes('warning')) {
    return name.replace('warning', 'alert-circle')
  }
  //warning to alert-triangle
  if (name.includes('warning')) {
    return name.replace('warning', 'alert-triangle')
  }
  //success,done to check-circle
  if (name.includes('success')) {
    return name.replace('success', 'check-circle')
  }
  if (name.includes('done')) {
    return name.replace('done', 'check-circle')
  }
  //danger,error to x
  if (name.includes('danger')) {
    return name.replace('danger', 'x')
  }
  if (name.includes('error')) {
    return name.replace('error', 'x')
  }
  //radiation to anchor
  if (name.includes('radiation')) {
    return name.replace('radiation', 'aperture')
  }
  //bug to shield
  if (name.includes('bug')) {
    return name.replace('bug', 'shield')
  }
  return name;
}

// {% note style, content %}
function postNote(args) {
  const feather = hexo.theme.config.tag_plugins.note.feather;
  if(/::/g.test(args)){
    args = args.join(' ').split('::');
  }
  else{
    args = args.join(' ').split(',');
  }
  if (args.length > 1) {
    const cls = args[0].trim();
    const text = args[1].trim();
    // 原始内容兼容 feather 表示
    if(feather) {
      return `<div class="feather"><i class="feather ${rFeather(cls)}"></i>${hexo.render.renderSync({text: text, engine: 'markdown'}).split('\n').join('')}</div>`;
    }
    return `<div class="note ${cls}">${hexo.render.renderSync({text: text, engine: 'markdown'}).split('\n').join('')}</div>`;
  } else if (args.length > 0) {
    const text = args[0].trim();
    if(feather) {
      return `<div class="feather"><i class="feather chevron-right"></i>${hexo.render.renderSync({text: text, engine: 'markdown'}).split('\n').join('')}</div>`;
    }
    return `<div class="note">${hexo.render.renderSync({text: text, engine: 'markdown'}).split('\n').join('')}</div>`;
  }
}

// {% noteblock style, title %}
// content
// {% endnoteblock %}
function postNoteBlock(args, content) {
  if(/::/g.test(args)){
    args = args.join(' ').split('::');
  }
  else{
    args = args.join(' ').split(',');
  }
  if (args.length < 1) {
    return;
  }
  const cls = args[0].trim();
  let ret = '';
  ret += '<div class="note ' + cls + '">';
  if (args.length > 1) {
    const title = args[1].trim();
    ret += '<p><strong>' + title + '</strong></p>';
  }
  ret += hexo.render.renderSync({text: content, engine: 'markdown'}).split('\n').join('');
  ret += '</div>';
  return ret;
}

hexo.extend.tag.register('note', postNote);

// https://github.com/volantis-x/hexo-theme-volantis/issues/712
// {% blocknote style, title %}
// content
// {% endblocknote %}
hexo.extend.tag.register('blocknote', postNoteBlock, {ends: true});
// 兼容 noteblock
hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(/{%\s+noteblock(.*)%}/g, (p,q)=>{
    return `{% blocknote ${q} %}`
  });
  data.content = data.content.replace(/{%\s+endnoteblock\s+%}/g, '{% endblocknote %}');
  return data;
});
// 兼容 noteblock 失败
hexo.extend.tag.register('noteblock', postNoteBlockDeprecated, {ends: true});
function postNoteBlockDeprecated(args, content) {
    throw new Error(`
==================================================================================
        {% noteblock %} is deprecated. Use {% blocknote %} instead.
        see: https://github.com/volantis-x/hexo-theme-volantis/issues/712
==================================================================================
  `);
}