
const RightMenus = {
  defaultEvent: ['copyText', 'copyLink', 'copyPaste', 'copyAll', 'copyCut', 'copyImg', 'printMode', 'readMode'],
  defaultGroup: ['navigation', 'inputBox', 'seletctText', 'elementCheck', 'elementImage', 'articlePage'],
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
  },

  /**
   * 读取剪切板
   * @returns {Promise<string>}
   */
  readClipboard: async () => {
    try {
      const result = await navigator.permissions.query({ name: 'clipboard-read' });
      if (result.state === 'granted' || result.state === 'prompt') {
        return await navigator.clipboard.readText();
      } else {
        window.clipboardRead = false;
        return '';
      }
    } catch (err) {
      console.error('读取剪切板失败: ', err);
      return '';
    }
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
  insertAtCaret: (elemt, value) => {
    const { selectionStart: startPos, selectionEnd: endPos, scrollTop } = elemt;
    const newValue = elemt.value.substring(0, startPos) + value + elemt.value.substring(endPos);

    elemt.value = newValue;
    elemt.setSelectionRange(startPos + value.length, startPos + value.length);
    elemt.scrollTop = scrollTop;
    elemt.focus();
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
    fn.elementAppend();
    fn.contextmenu();
    fn.menuEvent();
  }

  /**
   * 预置元素设定
   */
  fn.elementAppend = () => {
    // 阅读模式
    if (_readBkg) _readBkg.remove();
    const readBkg = document.createElement("div");
    readBkg.className = "common_read_bkg common_read_hide";
    readBkg.id = "read_bkg";
    document.body.appendChild(readBkg);
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
    if (_menuMusic) _menuMusic.style.display = globalData.isShowMusic ? 'block' : 'none';

    _rightMenuList.forEach(item => {
      const { nodeName, dataset: { group: groupName, event: itemEvent } } = item.firstElementChild;
      item.style.display = 'none';

      if (globalData.statusCheck || globalData.isArticle) {
        switch (groupName) {
          case 'inputBox':
            if (globalData.isInputBox) {
              const conditions = [
                itemEvent !== 'copyCut' || globalData.selectText,
                itemEvent !== 'copyAll' || globalData.inputValue,
                itemEvent !== 'copyPaste' || globalData.isReadClipboard
              ];
              item.style.display = conditions.every(cond => cond) ? 'block' : 'none';
            }
            break;
          case 'seletctText':
            if (globalData.selectText) item.style.display = 'block';
            break;
          case 'elementCheck':
            if (globalData.isLink || globalData.isMediaLink) item.style.display = 'block';
            break;
          case 'elementImage':
            if (globalData.isImage) item.style.display = 'block';
            break;
          case 'articlePage':
            if (globalData.isArticle) item.style.display = 'block';
            break;
          default:
            item.style.display = nodeName === 'A'
              ? globalData.isArticle && !globalData.statusCheck && rightMenuConfig.options.articleShowLink ? 'block' : 'none'
              : 'block';
            break;
        }
      } else if (nodeName === 'A' || !RightMenus.defaultGroup.includes(groupName)) {
        item.style.display = 'block';
      }
    });

    // 执行外部事件
    volantis.mouseEvent = event;
    volantis.rightmenu.method.handle.start();

    // 过滤 HR 元素
    let elementHrItem = { item: null, hide: true };
    _rightMenuListWithHr.forEach(item => {
      if (item.nodeName === "HR") {
        item.style.display = 'block';
        if (!elementHrItem.item) {
          elementHrItem.item = item;
          return;
        }
        if (elementHrItem.hide || elementHrItem.item.nextElementSibling.nodeName === "HR") {
          elementHrItem.item.style.display = 'none';
        }
        elementHrItem.item = item;
        elementHrItem.hide = true;
      } else if (item.style.display === 'block' && elementHrItem.hide) {
        elementHrItem.hide = false;
      }
    });
    if (elementHrItem.item && elementHrItem.hide) elementHrItem.item.style.display = 'none';
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
      const eventName = item.firstElementChild.getAttribute('data-event');
      const id = item.firstElementChild.getAttribute('id');
      const groupName = item.firstElementChild.getAttribute('data-group');
      if (item.firstElementChild.nodeName === "A") return;
      item.addEventListener('click', () => {
        try {
          if (!RightMenus.defaultEvent.includes(eventName)) {
            switch (groupName) {
              case 'seletctText':
                RightMenusFunction[id](globalData.selectText);
                break;
              case 'elementCheck':
                RightMenusFunction[id](globalData.isLink ? globalData.linkUrl : globalData.mediaLinkUrl);
                break;
              case 'elementImage':
                RightMenusFunction[id](globalData.mediaLinkUrl);
                break;
              default:
                RightMenusFunction[id]();
            }
          } else {
            fn[eventName]();
          }
        } catch (error) {
          if (volantis.GLOBAL_CONFIG.debug === "rightMenus") {
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
    const result = await RightMenus.readClipboard() || '';
    if (window.clipboardRead === false) {
      console.error('系统提示', '未授予剪切板读取权限！');
    } else if (result === '') {
      console.error('系统提示', '仅支持复制文本内容！');
    } else {
      RightMenus.insertAtCaret(globalData.mouseEvent.target, result);
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
    RightMenus.writeClipImg(globalData.mediaLinkUrl, e => { }, e => {
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

    DOMController.setAttribute('details', 'open', 'true');

    const elementsToRemove = [
      '.cus-article-bkg', '.iziToast-overlay', '.iziToast-wrapper', '.prev-next',
      'footer', '#l_header', '#l_cover', '#l_side', '#comments', '#s-top', '#BKG',
      '#rightmenu-wrapper', '.nav-tabs', '.new-meta-item.share',
      '.new-meta-box', 'button.btn-copy', 'iframe'
    ];
    DOMController.removeList(elementsToRemove);

    const styleList = [
      ['body', 'backgroundColor', 'unset'], ['#l_main, .copyright.license', 'width', '100%'],
      ['#post', 'boxShadow', 'none'], ['#post', 'background', 'none'], ['#post', 'padding', '0'],
      ['h1', 'textAlign', 'center'], ['h1', 'fontWeight', '600'], ['h1', 'fontSize', '2rem'], ['h1', 'marginBottom', '20px'],
      ['.tab-pane', 'display', 'block'], ['.tab-content', 'borderTop', 'none'], ['.highlight>table pre', 'whiteSpace', 'pre-wrap'],
      ['.highlight>table pre', 'wordBreak', 'break-all'], ['.fancybox img', 'height', 'auto'], ['.fancybox img', 'weight', 'auto'],
      ['.copyright.license', 'margin', '0'], ['.copyright.license', 'padding', '1.25em 20px'],
      ['figure.highlight, .copyright.license', 'display', 'inline-block']
    ];
    DOMController.setStyleList(styleList);

    setTimeout(() => {
      window.print();
      document.body.innerHTML = '';
      window.location.reload();
    }, 50);
  }

  fn.readMode = () => {
    if (typeof ScrollReveal === 'function') ScrollReveal().clean('#comments');
    const elementsToFade = [
      document.querySelector('#l_cover'), document.querySelector('footer'),
      document.querySelector('#s-top'), document.querySelector('.article-meta#bottom'),
      document.querySelector('.prev-next'), document.querySelector('#l_side'),
      document.querySelector('#comments')
    ];

    DOMController.setStyle('#l_header', 'opacity', 0);
    DOMController.fadeToggleList(elementsToFade);

    const elementsToToggle = [
      ['#l_main', 'common_read'], ['#l_main', 'common_read_main'],
      ['#l_body', 'common_read'], ['#safearea', 'common_read'],
      ['#pjax-container', 'common_read'], ['#read_bkg', 'common_read_hide'],
      ['h1', 'common_read_h1'], ['#post', 'post_read'],
      ['#l_cover', 'read_cover'], ['.widget.toc-wrapper', 'post_read']
    ];

    elementsToToggle.forEach(([selector, className]) => {
      DOMController.toggleClass(document.querySelector(selector), className);
    });

    DOMController.setStyle('.copyright.license', 'margin', '15px 0');

    volantis.isReadModel = volantis.isReadModel === undefined ? true : !volantis.isReadModel;

    if (volantis.isReadModel) {
      const readModeHandler = event => {
        if (DOMController.hasClass(event.target, 'common_read')) {
          fn.readMode();
        }
      };
      document.querySelector('#l_body').removeEventListener('click', fn.readMode);
      document.querySelector('#l_body').addEventListener('click', readModeHandler);
    } else {
      document.querySelector('#l_body').removeEventListener('click', fn.readMode);
      document.querySelector('#post').removeEventListener('click', fn.readMode);
      DOMController.setStyle('.prev-next', 'display', 'flex');
      DOMController.setStyle('.copyright.license', 'margin', '15px -40px');
      DOMController.setStyle('#l_header', 'opacity', 'unset');
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


/* DOM 控制 */
const DOMController = {
  visible: (ele, type = true) => {
    if (ele) ele.style.display = type ? 'block' : 'none';
  },

  remove: (param) => {
    document.querySelectorAll(param).forEach(ele => ele.remove());
  },

  removeList: (list) => {
    list.forEach(DOMController.remove);
  },

  setAttribute: (param, attrName, attrValue) => {
    document.querySelectorAll(param).forEach(ele => ele.setAttribute(attrName, attrValue));
  },

  setAttributeList: (list) => {
    list.forEach(([param, attrName, attrValue]) => {
      DOMController.setAttribute(param, attrName, attrValue);
    });
  },

  setStyle: (param, styleName, styleValue) => {
    document.querySelectorAll(param).forEach(ele => ele.style[styleName] = styleValue);
  },

  setStyleList: (list) => {
    list.forEach(([param, styleName, styleValue]) => {
      DOMController.setStyle(param, styleName, styleValue);
    });
  },

  fadeIn: (e) => {
    if (!e) return;
    Object.assign(e.style, {
      visibility: "visible",
      opacity: 1,
      display: "block",
      transition: "all 0.5s linear"
    });
    return e;
  },

  fadeOut: (e) => {
    if (!e) return;
    Object.assign(e.style, {
      visibility: "hidden",
      opacity: 0,
      display: "none",
      transition: "all 0.5s linear"
    });
    return e;
  },

  fadeToggle: (e) => {
    if (!e) return;
    return e.style.visibility == "hidden" ? DOMController.fadeIn(e) : DOMController.fadeOut(e);
  },

  fadeToggleList: (list) => {
    list.forEach(DOMController.fadeToggle);
  },

  hasClass: (e, c) => {
    return e ? e.className.match(new RegExp(`(\\s|^)${c}(\\s|$)`)) : false;
  },

  addClass: (e, c) => {
    if (e) e.classList.add(c);
    return e;
  },

  removeClass: (e, c) => {
    if (e) e.classList.remove(c);
    return e;
  },

  toggleClass: (e, c) => {
    if (!e) return;
    return DOMController.hasClass(e, c) ? DOMController.removeClass(e, c) : DOMController.addClass(e, c);
  },

  toggleClassList: (list) => {
    list.forEach(([e, c]) => {
      DOMController.toggleClass(e, c);
    });
  }
};
Object.freeze(DOMController);
