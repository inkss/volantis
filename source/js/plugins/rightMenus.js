
const RightMenus = {
  defaultEvent: ['copyText', 'copyLink', 'copyPaste', 'copyAll', 'copyCut', 'copyImg', 'printMode', 'readMode'],
  defaultGroup: ['navigation', 'inputBox', 'seletctText', 'elementCheck', 'articlePage'],
  messageRightMenu: volantis.GLOBAL_CONFIG.plugins.message.enable && volantis.GLOBAL_CONFIG.plugins.message.rightmenu.enable,
  urlRegx: /^((https|http)?:\/\/)+[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/,

  /**
   * 加载右键菜单
   */
  initialMenu: () => {
    RightMenus.fun.init();
    volantis.pjax.send(() => {
      RightMenus.fun.hideMenu();
      if (volantis.isReadModel) RightMenus.fun.readMode();
    })
  },

  /**
   * 读取剪切板
   * @returns text
   */
  readClipboard: async () => {
    const result = await navigator.permissions.query({
      name: 'clipboard-read'
    });
    if (result.state === 'granted' || result.state === 'prompt') {
      return navigator.clipboard
        .readText()
        .then(text => text)
        .catch(err => Promise.reject(err));
    }
    return Promise.reject(result);
  },

  /**
   * 写入文本到剪切板
   * @param {String} text 
   */
  writeClipText: text => {
    return navigator.clipboard
      .writeText(text)
      .then(() => {
        return Promise.resolve()
      })
      .catch(err => {
        return Promise.reject(err)
      })
  },

  /**
   * 写入图片到剪切板
   * @param {*} link 
   * @param {*} success 
   * @param {*} error 
   */
  writeClipImg: async (link, success, error) => {
    try {
      const data = await fetch(`${link}?time=${Date.now()}`, {
        mode: 'cors',
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15"
        }
      });
      const blob = await data.blob();
      await navigator.clipboard
        .write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]).then(() => {
          success(true);
        }, (e) => {
          if (blob.type !== 'image/png')
            error(`当前文件类型不正确，不支持复制。`)
          else
            error(e);
        });
    } catch (e) {
      error(e)
    }
  },

  /**
   * 粘贴文本到剪切板
   * @param {*} elemt 
   * @param {*} value 
   */
  insertAtCaret: (elemt, value) => {
    const startPos = elemt.selectionStart,
      endPos = elemt.selectionEnd;
    if (document.selection) {
      elemt.focus();
      var sel = document.selection.createRange();
      sel.text = value;
      elemt.focus();
    } else {
      if (startPos || startPos == '0') {
        var scrollTop = elemt.scrollTop;
        elemt.value = elemt.value.substring(0, startPos) + value + elemt.value.substring(endPos, elemt.value.length);
        elemt.focus();
        elemt.selectionStart = startPos + value.length;
        elemt.selectionEnd = startPos + value.length;
        elemt.scrollTop = scrollTop;
      } else {
        elemt.value += value;
        elemt.focus();
      }
    }
  }
}

/**
 * 事件处理区域
 */
RightMenus.fun = (() => {
  const rightMenuConfig = volantis.GLOBAL_CONFIG.plugins.rightmenus;

  const
    fn = {},
    _rightMenuWrapper = document.getElementById('rightmenu-wrapper'),
    _rightMenuContent = document.getElementById('rightmenu-content'),
    _rightMenuList = document.querySelectorAll('#rightmenu-content li.menuLoad-Content'),
    _readBkg = document.getElementById('read_bkg'),
    _menuMusic = document.getElementById('menuMusic'),
    _backward = document.querySelector('#menuMusic .backward'),
    _toggle = document.querySelector('#menuMusic .toggle'),
    _forward = document.querySelector('#menuMusic .forward'),
    _menuHr = document.querySelectorAll('#rightmenu-content hr');

  // 公共数据
  let globalData = {
    mouseEvent: null,
    isInputBox: false,
    selectText: '',
    inputValue: '',
    isLink: false,
    linkUrl: '',
    isMediaLink: false,
    mediaLinkUrl: '',
    isPngImg: false,
    isArticle: false,
    pathName: '',
    isReadClipboard: false,
    readClipboard: '',
    isShowMusic: false,
    statusCheck: false
  }
  const globalDataBackup = Object.assign({}, globalData);

  /**
   * 初始化监听事件处理
   */
  fn.initEvent = () => {
    fn.elementAppend();
    fn.contextmenu();
    fn.menuEvent();
  }

  /**
   * 预置元素设定
   */
  fn.elementAppend = () => {
    // 阅读模式
    if (_readBkg) _readBkg.parentNode.removeChild(_readBkg);
    const readBkg = document.createElement("div");
    readBkg.className = "common_read_bkg common_read_hide";
    readBkg.id = "read_bkg";
    window.document.body.appendChild(readBkg);
  }

  /**
   * 右键菜单位置设定
   * @param {*} event 
   */
  fn.menuPosition = (event) => {
    try {
      let mouseClientX = event.clientX;
      let mouseClientY = event.clientY;
      let screenWidth = document.documentElement.clientWidth || document.body.clientWidth;
      let screenHeight = document.documentElement.clientHeight || document.body.clientHeight;

      _rightMenuWrapper.style.display = 'block';
      fn.menuControl(event);

      let menuWidth = _rightMenuContent.offsetWidth;
      let menuHeight = _rightMenuContent.offsetHeight;
      let showLeft = mouseClientX + menuWidth > screenWidth ? mouseClientX - menuWidth + 10 : mouseClientX;
      let showTop = mouseClientY + menuHeight > screenHeight ? mouseClientY - menuHeight + 10 : mouseClientY;
      showTop = mouseClientY + menuHeight > screenHeight && showTop < menuHeight && mouseClientY < menuHeight ?
        showTop + (screenHeight - menuHeight - showTop - 10) : showTop;
      _rightMenuWrapper.style.left = `${showLeft}px`;
      _rightMenuWrapper.style.top = `${showTop}px`;
      if (volantis.GLOBAL_CONFIG.plugins.message.rightmenu.notice) fn.menuNotic();
    } catch (error) {
      if (volantis.GLOBAL_CONFIG.debug) console.error(error);
      fn.hideMenu();
      return true;
    }
    return false;
  }

  /**
   * 菜单项控制
   * @param {*} event 
   */
  fn.menuControl = (event) => {
    fn.globalDataSet(event);
    if (!!_menuMusic) _menuMusic.style.display = globalData.isShowMusic ? 'block' : 'none';
    _rightMenuList.forEach(item => {
      item.style.display = 'none';
      const nodeName = item.firstElementChild.nodeName;
      const groupName = item.firstElementChild.getAttribute('data-group');
      const itemEvent = item.firstElementChild.getAttribute('data-event');
      if (globalData.statusCheck || globalData.isArticle) {
        switch (groupName) {
          case 'inputBox':
            if (globalData.isInputBox) item.style.display = 'block';
            if (itemEvent === 'copyCut' && !globalData.selectText) item.style.display = 'none';
            // 判断剪切板是否包含文本
            // Note: 异步? 导致了此处判断只能写这里（存在些微时间差）
            if (itemEvent === 'copyPaste')
              RightMenus.readClipboard().then(text => {
                if (!!text) {
                  globalData.isReadClipboard = true;
                  globalData.readClipboard = text;
                } else {
                  item.style.display = 'none';
                }
              }).catch(() => {
                item.style.display = 'none';
              })
            break;
          case 'seletctText':
            if (!!globalData.selectText) item.style.display = 'block';
            break;
          case 'elementCheck':
            if (globalData.isLink || globalData.isMediaLink) item.style.display = 'block';
            if (itemEvent === 'copyImg' && !globalData.isPngImg) item.style.display = 'none';
            break;
          case 'articlePage':
            if (globalData.isArticle) item.style.display = 'block';
            break;
          default:
            item.style.display = nodeName === 'A'
              ? globalData.isArticle && !globalData.statusCheck && rightMenuConfig.options.articleShowLink
                ? 'block'
                : 'none'
              : 'block';
            break;
        }
      } else if (nodeName === 'A' || RightMenus.defaultGroup.every(item => { return groupName !== item })) {
        item.style.display = 'block';
      }
    })
    _menuHr.forEach(item => {
      item.style.display = globalData.statusCheck ? 'none' : 'block';
    })
  }

  /**
   * 元素状态判断/全局数据设置
   * @param {*} event 
   */
  fn.globalDataSet = (event) => {
    globalData = Object.assign({}, globalDataBackup);
    globalData.mouseEvent = event;
    globalData.selectText = window.getSelection().toString();

    // 判断是否为输入框
    if (event.target.tagName.toLowerCase() === 'input' || event.target.tagName.toLowerCase() === 'textarea') {
      globalData.isInputBox = true;
      globalData.inputValue = event.target.value;
    }

    // 判断是否包含链接
    if (!!event.target.href && RightMenus.urlRegx.test(event.target.href)) {
      globalData.isLink = true;
      globalData.linkUrl = event.target.href;
    }

    // 判断是否包含媒体链接
    if (!!event.target.currentSrc && RightMenus.urlRegx.test(event.target.currentSrc)) {
      globalData.isMediaLink = true;
      globalData.mediaLinkUrl = event.target.currentSrc;
    }

    // 判断是否为 png 格式的图片地址
    if (globalData.isMediaLink && globalData.mediaLinkUrl.trimEnd().endsWith('.png')) {
      globalData.isPngImg = true;
    }

    // 判断是否为文章页面
    if (!!(document.querySelector('#post.article') || null)) {
      globalData.isArticle = true;
      globalData.pathName = window.location.pathname;
    }

    // 判断是否显示音乐控制器
    if (volantis.GLOBAL_CONFIG.plugins.aplayer.enable
      && typeof RightMenuAplayer !== 'undefined'
      && RightMenuAplayer.APlayer.player !== undefined) {
      if (rightMenuConfig.options.musicAlwaysShow
        || RightMenuAplayer.APlayer.status === 'play'
        || RightMenuAplayer.APlayer.status === 'undefined') {
        globalData.isShowMusic = true;
      }
    }

    // 设定校验状态
    if (!!globalData.selectText || globalData.isInputBox || globalData.isLink || globalData.isMediaLink) {
      globalData.statusCheck = true;
    }
  }

  /**
   * 全局右键监听函数
   */
  fn.contextmenu = () => {
    window.document.oncontextmenu = (event) => {
      if (event.ctrlKey || document.body.offsetWidth <= 500) {
        fn.hideMenu();
        return true;
      }
      return fn.menuPosition(event);
    }

    _rightMenuWrapper.oncontextmenu = (event) => {
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    window.removeEventListener('blur', fn.hideMenu);
    window.addEventListener('blur', fn.hideMenu);
    document.body.removeEventListener('click', fn.hideMenu);
    document.body.addEventListener('click', fn.hideMenu);
  }

  /**
   * 菜单项事件处理函数
   */
  fn.menuEvent = () => {
    _rightMenuList.forEach(item => {
      let eventName = item.firstElementChild.getAttribute('data-event');
      const id = item.firstElementChild.getAttribute('id');
      const groupName = item.firstElementChild.getAttribute('data-group');
      if (item.firstElementChild.nodeName === "A") return;
      item.addEventListener('click', () => {
        try {
          if (RightMenus.defaultEvent.every(item => { return eventName !== item })) {
            if (groupName === 'seletctText') {
              RightMenusFunction[id](globalData.selectText)
            } else if (groupName === 'elementCheck') {
              RightMenusFunction[id](globalData.isLink ? globalData.linkUrl : globalData.mediaLinkUrl)
            } else {
              RightMenusFunction[id]()
            }
          } else {
            fn[eventName]()
          }
        } catch (error) {
          if (volantis.GLOBAL_CONFIG.debug) {
            console.error({
              id: id,
              error: error,
              globalData: globalData,
              groupName: groupName,
              eventName: eventName
            });
          }
          if (RightMenus.messageRightMenu) {
            VolantisApp.message('错误提示', error, {
              icon: rightMenuConfig.options.iconPrefix + ' fa-exclamation-square red',
              time: '15000'
            });
          }
        }
      })
    })

    if (_forward && _toggle && _forward) {
      _backward.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerBackward();
      }
      _toggle.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerToggle();
      }
      _forward.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerForward();
      }
    }
  }

  /**
   * 隐藏菜单显示
   */
  fn.hideMenu = () => {
    _rightMenuWrapper.style.display = null;
    _rightMenuWrapper.style.left = null;
    _rightMenuWrapper.style.top = null;
  }

  /**
   * 右键菜单覆盖提示
   */
  fn.menuNotic = () => {
    const NoticeRightMenu = localStorage.getItem('NoticeRightMenu') === 'true';
    if (RightMenus.messageRightMenu && !NoticeRightMenu)
      VolantisApp.message('右键菜单', '唤醒原系统菜单请使用：<kbd>Ctrl</kbd> + <kbd>右键</kbd>', {
        icon: rightMenuConfig.options.iconPrefix + ' fa-exclamation-square red',
        displayMode: 1,
        time: 9000
      }, () => {
        localStorage.setItem('NoticeRightMenu', 'true')
      });
  }

  fn.copyText = () => {
    VolantisApp.utilWriteClipText(globalData.selectText)
      .then(() => {
        if (RightMenus.messageRightMenu) {
          VolantisApp.messageCopyright();
        }
      }).catch(e => {
        if (RightMenus.messageRightMenu) {
          VolantisApp.message('系统提示', e, {
            icon: rightMenuConfig.options.iconPrefix + ' fa-exclamation-square red',
            displayMode: 1,
            time: 9000
          });
        }
      })
  }

  fn.copyLink = () => {
    VolantisApp.utilWriteClipText(globalData.linkUrl || globalData.mediaLinkUrl)
      .then(() => {
        if (RightMenus.messageRightMenu) {
          VolantisApp.messageCopyright();
        }
      }).catch(e => {
        if (RightMenus.messageRightMenu) {
          VolantisApp.message('系统提示', e, {
            icon: rightMenuConfig.options.iconPrefix + ' fa-exclamation-square red',
            displayMode: 1,
            time: 9000
          });
        }
      })
  }

  fn.copyAll = () => {
    globalData.mouseEvent.target.select();
  }

  fn.copyPaste = () => {
    RightMenus.insertAtCaret(globalData.mouseEvent.target, globalData.readClipboard);
  }

  fn.copyCut = () => {
    const statrPos = globalData.mouseEvent.target.selectionStart;
    const endPos = globalData.mouseEvent.target.selectionEnd;
    const inputStr = globalData.inputValue;
    fn.copyText(globalData.selectText);
    globalData.mouseEvent.target.value = inputStr.substring(0, statrPos) + inputStr.substring(endPos, inputStr.length);
    globalData.mouseEvent.target.selectionStart = statrPos;
    globalData.mouseEvent.target.selectionEnd = statrPos;
    globalData.mouseEvent.target.focus();
  }

  fn.copyImg = () => {
    RightMenus.writeClipImg(globalData.mediaLinkUrl, flag => {
      if (flag && RightMenus.messageRightMenu)
        VolantisApp.message('系统提示', '图片复制成功！', {
          icon: rightMenuConfig.options.iconPrefix + ' fa-images'
        });
    }, (error) => {
      console.error(error);
      if (RightMenus.messageRightMenu)
        VolantisApp.message('系统提示', '复制失败：' + error, {
          icon: rightMenuConfig.options.iconPrefix + ' fa-exclamation-square red',
          time: 9000
        });
    })
  }

  fn.printMode = () => {
    if (window.location.pathname === globalData.pathName) {
      if (RightMenus.messageRightMenu) {
        const message = '是否打印当前页面？<br><em style="font-size: 80%">建议打印时勾选背景图形</em><br>'
        VolantisApp.question('', message, { time: 9000 }, () => { fn.printHtml() })
      } else {
        fn.printHtml()
      }
    }
  }

  fn.printHtml = () => {
    if (volantis.isReadModel) fn.readMode();
    DOMController.setAttribute('details', 'open', 'true');
    DOMController.removeList([
      '.cus-article-bkg', '.iziToast-overlay', '.iziToast-wrapper', '.prev-next',
      'footer', '#l_header', '#l_cover', '#l_side', '#comments', '#s-top', '#BKG',
      '#rightmenu-wrapper', '.nav-tabs', '.parallax-mirror', '.new-meta-item.share', 'div.footer'
    ]);
    DOMController.setStyleList([
      ['body', 'backgroundColor', 'unset'], ['#l_main', 'width', '100%'], ['#post', 'boxShadow', 'none'],
      ['#post', 'background', 'none'], ['#post', 'padding', '0'], ['h1', 'textAlign', 'center'],
      ['h1', 'fontWeight', '600'], ['h1', 'fontSize', '2rem'], ['h1', 'marginBottom', '20px'],
      ['.tab-pane', 'display', 'block'], ['.tab-content', 'borderTop', 'none'], ['.highlight>table pre', 'whiteSpace', 'pre-wrap'],
      ['.highlight>table pre', 'wordBreak', 'break-all'], ['.fancybox img', 'height', 'auto'], ['.fancybox img', 'weight', 'auto']
    ]);
    setTimeout(() => {
      window.print();
      document.body.innerHTML = '';
      window.location.reload();
    }, 50);
  }

  fn.readMode = () => {
    if (typeof ScrollReveal === 'function') ScrollReveal().clean('#comments');
    DOMController.fadeToggleList([
      document.querySelector('#l_header'), document.querySelector('footer'),
      document.querySelector('#s-top'), document.querySelector('.article-meta#bottom'),
      document.querySelector('.prev-next'), document.querySelector('#l_side'),
      document.querySelector('#comments')
    ]);
    DOMController.toggleClassList([
      [document.querySelector('#l_main'), 'common_read'], [document.querySelector('#l_main'), 'common_read_main'],
      [document.querySelector('#l_body'), 'common_read'], [document.querySelector('#safearea'), 'common_read'],
      [document.querySelector('#pjax-container'), 'common_read'], [document.querySelector('#read_bkg'), 'common_read_hide'],
      [document.querySelector('h1'), 'common_read_h1'], [document.querySelector('#post'), 'post_read'],
      [document.querySelector('#l_cover'), 'read_cover'], [document.querySelector('.widget.toc-wrapper'), 'post_read']
    ]);
    volantis.isReadModel = volantis.isReadModel === undefined ? true : !volantis.isReadModel;
    if (volantis.isReadModel) {
      if (RightMenus.messageRightMenu) VolantisApp.message('系统提示', '阅读模式已开启，您可以点击屏幕空白处退出。', {
        backgroundColor: 'var(--color-read-post)',
        icon: rightMenuConfig.options.iconPrefix + ' fa-book-reader',
        displayMode: 1,
        time: 5000
      });
      document.querySelector('#l_body').removeEventListener('click', fn.readMode);
      document.querySelector('#l_body').addEventListener('click', (event) => {
        if (DOMController.hasClass(event.target, 'common_read')) {
          fn.readMode();
        }
      });
    } else {
      document.querySelector('#l_body').removeEventListener('click', fn.readMode);
      document.querySelector('#post').removeEventListener('click', fn.readMode);
      document.querySelector('.prev-next').style.display = 'flex'; // 单独修改 
    }
  }

  return {
    init: fn.initEvent,
    hideMenu: fn.hideMenu,
    readMode: fn.readMode
  }
})()

Object.freeze(RightMenus);
volantis.requestAnimationFrame(() => {
  if (document.readyState !== 'loading') {
    RightMenus.initialMenu();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      RightMenus.initialMenu();
    })
  }
});
