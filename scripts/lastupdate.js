hexo.extend.generator.register('lastupdate', function () {
  return {
    path: 'lastupdate.json',
    data: JSON.stringify({ lastupdate: hexo.theme.config.getStartTime })
  };
});
