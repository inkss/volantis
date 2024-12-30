'use strict';

hexo.extend.filter.register('after_render:html', function(data) {
  // 使用正则表达式匹配并替换 <i> 标签中的 class 属性
  return data.replace(/<i[^>]*class="([^"]*feather[^"]*)"/gi, function(match, p1) {
      // 将 class 分割为数组
      let classList = p1.split(' ');
      // 找到 feather 的索引
      let featherIndex = classList.indexOf('feather');
      if (featherIndex !== -1 && featherIndex + 1 < classList.length) {
          // 提取 feather 后面的内容作为 data-feather 的值
          let dataFeatherValue = classList[featherIndex + 1];
          // 移除 feather 及其后的一个 class
          classList.splice(featherIndex, 2);
          // 重新组合 class 属性
          let newClass = classList.join(' ').trim();
          // 构建新的 <i> 标签，包含 data-feather 属性和剩余的 class 属性
          return match.replace(`class="${p1}"`, `data-feather="${dataFeatherValue}" class="${newClass}"`);
      }
      return match;
  });
});
