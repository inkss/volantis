const fs = require('fs');
const path = require('path');

let isGenerated = false;

hexo.on('generateBefore', () => {
  if (isGenerated) return;

  const theme = hexo.theme.config;

  if (!theme.plugins || !theme.plugins.rightmenus || !theme.plugins.rightmenus.enable) {
    return;
  }

  const rightmenusConfig = {
    options: theme.plugins.rightmenus.options,
    navigation: theme.plugins.rightmenus.navigation || [],
    menuList: theme.plugins.rightmenus.menuList || []
  };

  const jsonContent = JSON.stringify(rightmenusConfig, null, 2);
  const targetPath = path.join(hexo.base_dir, 'source', 'rightmenus.json');

  // 检查文件是否已存在且内容相同
  let shouldWrite = true;
  if (fs.existsSync(targetPath)) {
    const existingContent = fs.readFileSync(targetPath, 'utf8');
    if (existingContent === jsonContent) {
      shouldWrite = false;
    }
  }

  if (shouldWrite) {
    fs.writeFileSync(targetPath, jsonContent, 'utf8');
    hexo.log.info('Generated rightmenus.json');
  }

  isGenerated = true;
});
