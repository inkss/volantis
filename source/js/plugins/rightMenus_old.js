
const RightMenus = {
  defaultEvent: ['copyText', 'copyLink', 'copyPaste', 'copyAll', 'copyCut', 'copyImg', 'printMode', 'readMode', 'jumpArticle'],
  defaultGroup: ['navigation', 'inputBox', 'selectText', 'elementCheck', 'elementImage', 'articlePage'],
  corsAnywhere: volantis.GLOBAL_CONFIG.plugins.rightmenus.options.corsAnywhere,
  urlRegx: /^((https|http)?:\/\/)+[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/,
  imgRegx: /\.(jpe?g|png|webp|svg|gif|jifi|avif)(-|_|!|\?|\/)?.*$/,

  /**
   * 加载右键菜单
   */
  initialMenu: () => {
    RightMenus.fun.init();
    volantis.pjax.send(() => {
      RightMenus.fun.hideMenu();
      if (volantis.isReadModel) RightMenus.fun.readMode();
    });
    volantis.pjax.push(() => {
      RightMenus.fun.updateDate();
    })
  },

  /**
   * 读取剪切板
   * @returns {Promise<string>}
   */
  readClipboard: async () => {
    try {
      const result = await navigator.permissions.query({ name: 'clipboard-read' });
      if (result.state === 'granted' || result.state === 'prompt') {
        return navigator.clipboard.read();
      } else {
        window.clipboardRead = false;
      }
    } catch (err) {
      console.error('读取剪切板失败: ', err);
      window.clipboardRead = false;
    }
    return null;
  },

  /**
   * 写入文本到剪切板
   * @param {String} text
   * @returns {Promise<void>}
   */
  writeClipText: text => {
    return navigator.clipboard.writeText(text)
      .then(() => Promise.resolve())
      .catch(err => Promise.reject(err));
  },

  /**
   * 写入图片到剪切板
   * @param {*} link
   * @param {Function} success
   * @param {Function} error
   */
  writeClipImg: async (link, success, error) => {
    try {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.src = `${link}?(lll￢ω￢)~~`;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        canvas.toBlob(blob => {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(success).catch(error);
        }, 'image/png');
      };
      image.onerror = error;
    } catch (err) {
      error(err);
    }
  },

  /**
   * 粘贴文本到剪切板
   * @param {HTMLElement} elemt
   * @param {String} value
   */
  insertAtCaret: (elem, value) => {
    const { selectionStart: startPos, selectionEnd: endPos, scrollTop } = elem;
    const newValue = elem.value.substring(0, startPos) + value + elem.value.substring(endPos);

    elem.value = newValue;
    elem.setSelectionRange(startPos + value.length, startPos + value.length);
    elem.scrollTop = scrollTop;
    elem.focus();
  }
}

/**
 * 事件处理区域
 */
RightMenus.fun = (() => {
  const rightMenuConfig = volantis.GLOBAL_CONFIG.plugins.rightmenus;

  const fn = {},
    _rightMenuWrapper = document.getElementById('rightmenu-wrapper'),
    _rightMenuContent = document.getElementById('rightmenu-content'),
    _rightMenuList = document.querySelectorAll('#rightmenu-content li.menuLoad-Content'),
    _rightMenuListWithHr = document.querySelectorAll('#rightmenu-content li, #rightmenu-content hr, #menuMusic'),
    _readBkg = document.getElementById('read_bkg'),
    _menuMusic = document.getElementById('menuMusic'),
    _backward = document.querySelector('#menuMusic .backward'),
    _toggle = document.querySelector('#menuMusic .toggle'),
    _forward = document.querySelector('#menuMusic .forward');

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
    isImage: false,
    isArticle: false,
    pathName: '',
    isReadClipboard: true,
    isShowMusic: false,
    statusCheck: false
  };
  const globalDataBackup = { ...globalData };

  /**
   * 初始化监听事件处理
   */
  fn.initEvent = () => {
    fn.contextmenu();
    fn.menuEvent();
    fn.updateDate();
  }

  /**
   * 右键菜单位置设定
   * @param {*} event
   */
  fn.menuPosition = (event) => {
    try {
      const { clientX: mouseClientX, clientY: mouseClientY } = event;
      const screenWidth = document.documentElement.clientWidth || document.body.clientWidth;
      const screenHeight = document.documentElement.clientHeight || document.body.clientHeight;

      _rightMenuWrapper.style.display = 'block';
      fn.menuControl(event);

      const menuWidth = _rightMenuContent.offsetWidth;
      const menuHeight = _rightMenuContent.offsetHeight;
      let showLeft = mouseClientX + menuWidth > screenWidth ? mouseClientX - menuWidth + 10 : mouseClientX;
      let showTop = mouseClientY + menuHeight > screenHeight ? mouseClientY - menuHeight + 10 : mouseClientY;

      if (mouseClientY + menuHeight > screenHeight && showTop < menuHeight && mouseClientY < menuHeight) {
        showTop += screenHeight - menuHeight - showTop - 10;
      }

      _rightMenuWrapper.style.left = `${showLeft}px`;
      _rightMenuWrapper.style.top = `${showTop}px`;
    } catch (error) {
      console.error(error);
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
    if (_menuMusic) {
      _menuMusic.style.display = globalData.isShowMusic ? 'block' : 'none';
    }

    _rightMenuList.forEach(item => {
      const { nodeName, dataset: { group: groupName, event: itemEvent } } = item.firstElementChild;
      item.style.display = 'none';

      const showItem = () => {
        item.style.display = 'block';
      };

      if (globalData.statusCheck || globalData.isArticle) {
        switch (groupName) {
          case 'inputBox':
            if (globalData.isInputBox) {
              const conditions = [
                itemEvent !== 'copyCut' || globalData.selectText,
                itemEvent !== 'copyAll' || globalData.inputValue,
                itemEvent !== 'copyPaste' || globalData.isReadClipboard
              ];
              if (conditions.every(cond => cond)) showItem();
            }
            break;
          case 'selectText':
            if (globalData.selectText) showItem();
            break;
          case 'elementCheck':
            if (globalData.isLink || globalData.isMediaLink) showItem();
            break;
          case 'elementImage':
            if (globalData.isImage) showItem();
            break;
          case 'articlePage':
            if (globalData.isArticle) showItem();
            break;
          case 'prevNext':
            const isPrev = item.firstElementChild.id === 'prev';
            const isNext = item.firstElementChild.id === 'next';
            const hasPrevLink = document.querySelector('.prev-next > a.prev');
            const hasNextLink = document.querySelector('.prev-next > a.next');

            if ((isPrev && hasPrevLink) || (isNext && hasNextLink)) {
              showItem();
            }
            break;
          default:
            if (nodeName !== 'A'
              || (globalData.isArticle
                && !globalData.statusCheck
                && rightMenuConfig.options.articleShowLink)) {
              showItem();
            }
            break;
        }
      } else if (nodeName === 'A' || !RightMenus.defaultGroup.includes(groupName)) {
        showItem();
      }
    });

    // 执行外部事件
    volantis.mouseEvent = event;
    volantis.rightmenu.method.handle.start();

    // 过滤 HR 元素
    let elementHrItem = null;
    _rightMenuListWithHr.forEach(item => {
      if (item.nodeName === "HR") {
        item.style.display = 'block';
        if (elementHrItem) {
          elementHrItem.style.display = 'none';
        }
        elementHrItem = item;
      } else if (item.style.display === 'block') {
        elementHrItem = null;
      }
    });
    if (elementHrItem) {
      elementHrItem.style.display = 'none';
    }
  }

  /**
   * 元素状态判断/全局数据设置
   * @param {*} event
   */
  fn.globalDataSet = (event) => {
    globalData = { ...globalDataBackup };
    globalData.mouseEvent = event;
    globalData.selectText = window.getSelection().toString();

    const targetTag = event.target.tagName.toLowerCase();
    globalData.isInputBox = targetTag === 'input' || targetTag === 'textarea';

    if (globalData.isInputBox) {
      globalData.inputValue = event.target.value;
      globalData.isReadClipboard = window.clipboardRead !== false;
    }

    const { href, currentSrc } = event.target;
    const { urlRegx, imgRegx } = RightMenus;
    globalData.isLink = !!href && urlRegx.test(href);
    globalData.linkUrl = globalData.isLink ? href : undefined;
    globalData.isMediaLink = !!currentSrc && urlRegx.test(currentSrc);
    globalData.mediaLinkUrl = globalData.isMediaLink ? currentSrc : undefined;
    globalData.isImage = globalData.isMediaLink && imgRegx.test(globalData.mediaLinkUrl);

    globalData.isArticle = !!document.querySelector('#post.article');
    globalData.pathName = globalData.isArticle ? window.location.pathname : undefined;

    const aplayerEnabled = volantis.GLOBAL_CONFIG.plugins.aplayer?.enable;
    const aplayerDefined = typeof RightMenuAplayer !== 'undefined';
    const aplayerPlayer = aplayerDefined && RightMenuAplayer.APlayer.player;

    if (aplayerEnabled && aplayerPlayer) {
      const aplayerStatus = RightMenuAplayer.APlayer.status;
      globalData.isShowMusic = rightMenuConfig.options.musicAlwaysShow
        || aplayerStatus === 'play'
        || aplayerStatus === 'undefined';
    }

    globalData.statusCheck = !!globalData.selectText || globalData.isInputBox || globalData.isLink || globalData.isMediaLink;
  }

  /**
   * 全局右键监听函数
   */
  fn.contextmenu = () => {
    document.oncontextmenu = event => {
      if (event.ctrlKey || document.body.offsetWidth <= 500) {
        fn.hideMenu();
        return true;
      }
      return fn.menuPosition(event);
    };

    _rightMenuWrapper.oncontextmenu = event => {
      event.stopPropagation();
      event.preventDefault();
      return false;
    };

    const handleHideMenu = () => fn.hideMenu();

    window.removeEventListener('blur', handleHideMenu);
    window.addEventListener('blur', handleHideMenu);

    document.body.removeEventListener('click', handleHideMenu);
    document.body.addEventListener('click', handleHideMenu);
  }

  /**
   * 菜单项事件处理函数
   */
  fn.menuEvent = () => {
    _rightMenuList.forEach(item => {
      if (item.firstElementChild.nodeName === "A") return;
      const id = item.firstElementChild.getAttribute('id');
      const eventName = item.firstElementChild.getAttribute('data-event');
      const groupName = item.firstElementChild.getAttribute('data-group');
      item.addEventListener('click', e => {
        try {
          if (!RightMenus.defaultEvent.includes(eventName)) {
            switch (groupName) {
              case 'selectText':
                RightMenusFunction[id](globalData.selectText);
                break;
              case 'elementCheck':
                RightMenusFunction[id](globalData.isLink ? globalData.linkUrl : globalData.mediaLinkUrl);
                break;
              case 'elementImage':
                RightMenusFunction[id](globalData.mediaLinkUrl);
                break;
              default:
                RightMenusFunction[id](e);
            }
          } else {
            fn[eventName](e);
          }
        } catch (error) {
          if (volantis.debug === "rightMenus") {
            console.error({
              id: id,
              error: error,
              globalData: globalData,
              groupName: groupName,
              eventName: eventName
            });
          }
        }
      });
    });

    if (_forward && _toggle && _backward) {
      _backward.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerBackward();
      });
      _toggle.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerToggle();
      });
      _forward.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        RightMenuAplayer.aplayerForward();
      });
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

  fn.copyText = () => {
    VolantisApp.utilWriteClipText(globalData.selectText);
  }

  fn.copyLink = () => {
    VolantisApp.utilWriteClipText(globalData.linkUrl || globalData.mediaLinkUrl);
  }

  fn.copyAll = () => {
    globalData.mouseEvent.target.select();
  }

  fn.copyPaste = async () => {
    try {
      NProgress?.start();
      const clipboardItems = await RightMenus.readClipboard();
      if (clipboardItems === null && window?.clipboardRead === false) {
        throw new Error('没有读取剪切板的权限！')
      }
      let text = '';
      let imageFiles = [];

      for (const item of clipboardItems) {
        if (item.types.length === 0) {
          throw new Error('剪切板中没有可被读取的内容，目前仅支持文本和图像数据，暂不支持操作系统级别的文件复制粘贴操作。')
        }
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const imageBlob = await item.getType(type);
            const file = new File([imageBlob], 'clipboard-image.png', { type: type });
            imageFiles.push(file);
          } else if (type === 'text/plain') {
            const textBlob = await item.getType(type);
            const textContent = await textBlob.text();
            text += textContent;
          }
        }
      }

      // 粘贴文本内容
      RightMenus.insertAtCaret(globalData.mouseEvent.target, text);

      for (const file of imageFiles) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true
        });

        // 对剪切板中的图片尝试触发 paste 事件
        globalData.mouseEvent.target.dispatchEvent(pasteEvent);
      }
      NProgress?.done();
    } catch (err) {
      console.error(`粘贴失败，详细信息: ${err.stack}`);
      RightMenus.insertAtCaret(globalData.mouseEvent.target, err);
      NProgress?.done();
    }
  }

  fn.copyCut = () => {
    const { selectionStart: start, selectionEnd: end, value } = globalData.mouseEvent.target;
    fn.copyText(globalData.selectText);
    globalData.mouseEvent.target.value = value.substring(0, start) + value.substring(end);
    globalData.mouseEvent.target.setSelectionRange(start, start);
    globalData.mouseEvent.target.focus();
  }

  fn.copyImg = () => {
    NProgress?.start();
    RightMenus.writeClipImg(globalData.mediaLinkUrl, e => {
      NProgress?.done();
    }, e => {
      NProgress?.done();
      console.error(e);
    });
  }

  fn.printMode = () => {
    if (window.location.pathname === globalData.pathName) {
      fn.printHtml();
    }
  }

  fn.printHtml = () => {
    if (volantis.isReadModel) fn.readMode();
    document.querySelectorAll('details').forEach(ele => ele.setAttribute('open', 'true'));
    setTimeout(() => {
      window.print();
    }, 200);
  }

  fn.readMode = () => {
    if (!globalData.isArticle) return;
    const themeStylesheet = document.getElementById('reading-mode-stylesheet');
    themeStylesheet.disabled = !themeStylesheet.disabled
    volantis.isReadModel = !themeStylesheet.disabled;

    if (volantis.isReadModel) {
      // 开启阅读模式
      document.body.classList.add('read-mode');
    } else {
      // 关闭阅读模式
      document.body.classList.remove('read-mode');
    }
  }

  // 查看上一篇、下一篇
  fn.jumpArticle = (e) => {
    const direction = e.target.id === 'prev' ? 'prev' : 'next';
    const itemSelector = `article .prev-next a.${direction}`;
    const item = document.querySelector(itemSelector);
    
    if (item) {
      const href = item.href;
      if (typeof pjax !== 'undefined') {
        pjax.loadUrl(href);
      } else {
        window.location.href = href;
      }
    }
  }  

  /**
   * 回调更新内部数据
   */
  fn.updateDate = () => {
    globalData.isArticle = !!document.querySelector('#post.article');
  }

  return {
    init: fn.initEvent,
    hideMenu: fn.hideMenu,
    readMode: fn.readMode,
    updateDate: fn.updateDate
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
