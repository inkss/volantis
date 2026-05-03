hexo.extend.generator.register('rightmenus', function () {
  const theme = hexo.theme.config;

  if (!theme.plugins || !theme.plugins.rightmenus || !theme.plugins.rightmenus.enable) {
    return;
  }

  return {
    path: 'rightmenus.json',
    data: JSON.stringify({
      options: theme.plugins.rightmenus.options,
      navigation: theme.plugins.rightmenus.navigation || [],
      menuList: theme.plugins.rightmenus.menuList || []
    })
  };
});
