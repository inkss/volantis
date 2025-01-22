const contextMenuManager = {
  urlRegx: /^(https?:\/\/)?([A-Za-z0-9.-]+)\.([A-Za-z]{2,})(\/[A-Za-z0-9.-]*)*\/?(\?[A-Za-z0-9&=_-]*)?(#[A-Za-z0-9-_]*)?$/,
  readModeStylesheet: document.getElementById('reading-mode-stylesheet'),
  maxMenuItems: 0,
  isClipboardReadAllowed: true
};

// 初始化自定义右键菜单的函数
contextMenuManager.initializeContextMenu = function (menuSelector = '#rightmenu-wrapper') {
  const menuContainer = document.querySelector(menuSelector);
  if (!menuContainer) return;

  this.maxMenuItems = Number(menuContainer.dataset.maxMenuItems);

  // 右键导航项
  const navigationItems = Array.from(menuContainer.querySelectorAll('.navigation.menuNavigation-Content a'))
    .map(item => ({
      id: item.dataset.id,
      displayCondition: item.dataset.displayCondition,
      menuContentElement: item
    }));

  // 右键菜单项  
  const menuItems = Array.from(menuContainer.querySelectorAll('.menuLoad-Content'))
    .flatMap(item => {
      const elem = item.firstElementChild;
      if (elem) {
        return [{
          id: elem.dataset.id,
          link: elem.href,
          linkTarget: elem.target,
          eventName: elem.dataset.eventName,
          displayCondition: elem.dataset.displayCondition,
          isHrElement: elem.tagName === 'HR',
          menuContentElement: item
        }];
      }
      return [];
    });

  // 公共数据
  const globalData = {
    pointerEvent: null,  // 右键事件
    linkAddress: null,   // 链接地址
    selectedText: null,  // 选取文本
    inputContent: null   // 输入框
  };

  // 预设条件
  const conditions = {
    inInputField: (menuItem, pointerEvent) => {
      if (pointerEvent.target.tagName === 'INPUT' || pointerEvent.target.tagName === 'TEXTAREA') {
        globalData.inputContent = pointerEvent.target;
        globalData.selectedText = window.getSelection().toString();
        switch (menuItem.id) {
          case 'selectAllText':
            if (globalData.inputContent.value !== '') {
              return true;
            }
            break;
          case 'cutText':
            if (globalData.selectedText !== '') {
              return true;
            }
            break;
          case 'copyPaste':
            if (contextMenuManager.isClipboardReadAllowed) {
              return true;
            }
            break;
          default:
            return true;
        }
      }
      return false;
    },
    selectedText: () => {
      globalData.selectedText = window.getSelection().toString();
      return globalData.selectedText !== '';
    },
    onImage: (menuItem, pointerEvent) => {
      const target = pointerEvent.target;
      if (target.tagName === 'IMG' && target.hasAttribute('src')) {
        globalData.linkAddress = target.src;
        return true;
      }
      return false;
    },
    onLink: (menuItem, pointerEvent) => {
      if (this.urlRegx.test(globalData.selectedText)) {
        globalData.linkAddress = globalData.selectedText;
        return true;
      }
      const target = pointerEvent.target;
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        globalData.linkAddress = target.href;
        return true;
      }
      if (target.tagName === 'IMG' && target.hasAttribute('src')) {
        globalData.linkAddress = target.src;
        return true;
      }
      return false;
    },
    articlePage: (menuItem) => {
      if (menuItem.id === 'prev' || menuItem.id === 'next') {
        return !!document.querySelector(`article .prev-next a.${menuItem.id}`)
      }

      if (menuItem.id === 'comment') {
        const element = document.querySelector('#comments');

        // 校验元素存在，页面中显示，屏幕上显示
        return element
          && !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length)
          && (window.scrollY < (element.getBoundingClientRect().top - 50 + window.scrollY))
      }
      return !!document.querySelector('#post.article');
    },
    scrolledFromTop: () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop; 
      const halfScreenHeight = window.innerHeight / 2; 
      return scrollTop >= halfScreenHeight;
    },
    homePage: () => {
      return new URL(window.location.href).pathname !== '/'
    }
  };

  // 预设事件
  const eventHandlers = {
    scrollTop: () => {
      if (typeof volantis.scroll.to === 'function') {
        volantis.scroll.to(volantis.dom.bodyAnchor)
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    scrollComment: () => {
      const element = document.querySelector('#comments');
      if (typeof volantis.scroll.to === 'function') {
        volantis.scroll.to(element)
      } else {
        window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
      }
    },
    jumpArticle: (menuItem) => {
      const item = document.querySelector(`.prev-next a.${menuItem.id}`);

      if (item) {
        const href = item.href;
        if (typeof pjax !== 'undefined') {
          pjax.loadUrl(href);
        } else {
          window.location.href = href;
        }
      }
    },
    readMode: () => {
      this.readModeStylesheet.disabled = !this.readModeStylesheet.disabled;

      if (!this.readModeStylesheet.disabled) {
        document.body.classList.add('read-mode');
      } else {
        document.body.classList.remove('read-mode');
      }
    },
    printMode: () => {
      if (!this.readModeStylesheet.disabled) {
        eventHandlers.readMode()
      }

      document.querySelectorAll('details').forEach(ele => ele.setAttribute('open', 'true'));
      setTimeout(() => {
        window.print();
      }, 200);
    },
    copyText: () => {
      VolantisApp.utilWriteClipText(globalData.selectedText);
    },
    copyLink: () => {
      const target = globalData.pointerEvent.target;
      let link = '';
      if (target.tagName === 'IMG') {
        link = target.dataset.src || target.src
      }
      if (target.tagName === 'A') {
        link = target.href
      }
      VolantisApp.utilWriteClipText(link);
    },
    copyImg: (menuItem) => {
      NProgress?.start();
      try {
        const link = globalData.pointerEvent.target.dataset.src || globalData.pointerEvent.target.src;
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = `${link}?(lll￢ω￢)~~`;
        image.onerror = null;
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          canvas.toBlob(blob => {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).finally(() => {
              NProgress?.done();
            });
          }, 'image/png');
        };
      } catch (err) {
        console.error(`Menu: ${menuItem.id}, event:[${menuItem.eventName}] error: ${err}`)
        NProgress?.done();
      }
    },
    selectAllText: () => {
      globalData.inputContent.select();
    },
    cutText: (text) => {
      // 公共调用时第一个参数传递的是 Object
      let value = '';
      if (typeof text !== 'string') {
        VolantisApp.utilWriteClipText(globalData.selectedText);
      } else {
        VolantisApp.utilWriteClipText(text);
        value = text;
      }

      const element = globalData.inputContent;
      const { selectionStart: start, selectionEnd: end, scrollTop } = element;

      element.value = `${element.value.substring(0, start)}${value}${element.value.substring(end)}`
      element.setSelectionRange(start + value.length, start + value.length);
      element.scrollTop = scrollTop;
      element.focus();
    },
    copyPaste: async (menuItem, pointerEvent) => {
      try {
        NProgress?.start();
        const result = await navigator.permissions.query({ name: 'clipboard-read' });
        if (result.state === 'granted' || result.state === 'prompt') {
          const clipboardItems = await navigator.clipboard.read();

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
          eventHandlers.cutText(text);

          for (const file of imageFiles) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer,
              bubbles: true,
              cancelable: true
            });

            // 对剪切板中的图片尝试触发 paste 事件
            pointerEvent.target.dispatchEvent(pasteEvent);
          }

          contextMenuManager.isClipboardReadAllowed = true;
        } else {
          contextMenuManager.isClipboardReadAllowed = false;
          throw new Error('没有读取剪切板的权限！')
        }
        NProgress?.done();
      } catch (err) {
        console.error(`粘贴失败，详细信息: ${err}`);
        eventHandlers.cutText(err.toString());
        contextMenuManager.isClipboardReadAllowed = false;
        NProgress?.done();
      }
    }
  };

  /**
   * 调用外部判断/事件
   * 
   * @param {string} type 区分是调用外部执行事件还是外部控制条件。
   * @param {menuItems} menuItem 菜单定义项 
   * @param {Array} args 传递给事件函数的参数数组
   * @returns {*} 事件函数的返回值（如果存在）。
   */
  const executeEvent = (type, menuItem, args = []) => {
    const eventString = menuItem[type];
    const functionMatch = eventString.match(/^([^\(]+)\((.*)\)$/);

    let functionPath, functionArgs;
    if (functionMatch) {
      functionPath = functionMatch[1].trim();
      functionArgs = functionMatch[2].split(',').map(arg => arg.trim().replace(/['"]/g, ''));
    } else {
      functionPath = eventString.trim();
      functionArgs = [];
    }

    if (functionArgs.length === 1) {
      const arg = functionArgs[0];
      if (globalData[arg]) {
        functionArgs[0] = globalData[arg];
      } else {
        const matches = arg.match(/##(.*?)##/);
        if (matches) {
          const matchedValue = globalData[matches[1]];
          if (matchedValue && typeof matchedValue === 'string') {
            functionArgs[0] = arg.replace(matches[0], matchedValue);
          }
        }
      }
    }

    try {
      const properties = functionPath.split('.');
      let context = window;
      let parentContext = null;

      for (const prop of properties) {
        parentContext = context;
        context = context[prop];
        if (typeof context === 'undefined') {
          console.error(`Invalid ${type}: ${menuItem[type]}`);
          return;
        }
      }

      if (typeof context === 'function') {
        return context.apply(parentContext, [...functionArgs, ...args]);
      } else {
        const { menuContentElement, ...menu } = menuItem;
        console.error(`Invalid ${type} [${menuItem[type]}], Menu: ${JSON.stringify(menu)}`);
      }
    } catch (error) {
      console.error(error)
    }
  };

  /**
   * 条件判断
   * 
   * @param {menuItems} menuItem 菜单项
   * @param {PointerEvent} pointerEvent 右键事件
   * @returns {boolean} - true/false
   */
  const evaluateCondition = (menuItem, pointerEvent) => {
    if (!menuItem.displayCondition) {
      return true;
    }
    if (conditions[menuItem.displayCondition]) {
      return conditions[menuItem.displayCondition](menuItem, pointerEvent);
    }
    const result = executeEvent('displayCondition', menuItem, [pointerEvent]);
    if (typeof result === 'boolean') {
      return result;
    }
    return false;
  };

  /**
   * 事件调用
   * 
   * @param {string} id 事件 id
   * @param {string} eventName 事件名称
   * @param {Event} event 点击事件
   */
  const handleEvent = (id, eventName, event) => {
    const item = menuItems.find(item => item.eventName === eventName && item.id === id)
      || navigationItems.find(item => item.eventName === eventName && item.id === id)
      || { id: id, eventName: eventName };
    if (eventHandlers[eventName]) {
      eventHandlers[eventName](item, globalData.pointerEvent);
    } else {
      executeEvent('eventName', item, [event, globalData.pointerEvent]);
    }
  };

  /**
   * 显示菜单项
   * 
   * @param {PointerEvent} pointerEvent 右键事件
   */
  const showCustomContextMenu = (pointerEvent) => {
    let menuItemsCount = 0;

    // 根据条件显示/隐藏菜单项  
    menuItems.forEach(item => {
      if (evaluateCondition(item, pointerEvent)) {
        item.menuContentElement.classList.add('active');
        if (!item.isHrElement) {
          menuItemsCount++;
        }
      } else {
        item.menuContentElement.classList.remove('active');
      }
    })

    // 处理过长菜单项
    // 当总菜单项累计显示数量大于设定数量时，隐藏所有链接型菜单
    if (menuItemsCount > this.maxMenuItems) {
      menuItems.forEach(item => {
        if (item.link) {
          item.menuContentElement.classList.remove('active');
        }
      })
    }

    // 处理“相邻、第一个显示、最后一个显示”的菜单分割项
    let lastSeparator = null;
    menuItems.forEach(menuItem => {
      if (menuItem.isHrElement) {
        menuItem.menuContentElement.classList.add('active');
        if (lastSeparator) {
          lastSeparator.classList.remove('active');
        }
        lastSeparator = menuItem.menuContentElement;
      } else if (menuItem.menuContentElement.classList.contains('active')) {
        lastSeparator = null;
      }
    });
    if (lastSeparator) {
      lastSeparator.classList.remove('active');
    }
    if (navigationItems.length === 0) {
      const firstActiveMenuItem = menuItems.find(item => item.menuContentElement.classList.contains('active'))
      if (firstActiveMenuItem.isHrElement) {
        firstActiveMenuItem.menuContentElement.classList.remove('active');
      }
    }

    // 处理导航栏显隐
    navigationItems.forEach(menuNav => {
      menuNav.menuContentElement.style.display = evaluateCondition(menuNav, pointerEvent)
        ? 'flex' : 'none';
    })
  };

  /**
   * 定位显示菜单
   * 
   * @param {PointerEvent} pointerEvent 右键事件
   */
  const positionMenu = (pointerEvent) => {
    pointerEvent.preventDefault();

    showCustomContextMenu(pointerEvent);

    menuContainer.classList.add('active');
    const { clientX: mouseClientX, clientY: mouseClientY } = pointerEvent;
    const screenWidth = document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = document.documentElement.clientHeight || document.body.clientHeight;
    const menuWidth = menuContainer.offsetWidth;
    const menuHeight = menuContainer.offsetHeight;

    let posX = mouseClientX + menuWidth > screenWidth ? mouseClientX - menuWidth + 10 : mouseClientX;
    let posY = mouseClientY + menuHeight > screenHeight ? mouseClientY - menuHeight + 10 : mouseClientY;
    if (mouseClientY + menuHeight > screenHeight && posY < menuHeight && mouseClientY < menuHeight) {
      posY += screenHeight - menuHeight - posY - 10;
    }

    menuContainer.style.left = `${posX}px`;
    menuContainer.style.top = `${posY}px`;
  };

  /**
   * 隐藏自定义右键菜单
   */
  const hideContextMenu = () => {
    if (menuContainer.classList.contains('active')) {
      menuContainer.classList.remove('active');
    }
  };

  /**
   * 覆盖浏览器默认右键菜单
   */
  document.addEventListener('contextmenu', (pointerEvent) => {
    hideContextMenu();
    globalData.pointerEvent = pointerEvent;
    if (pointerEvent.ctrlKey || document.body.offsetWidth <= 500) {
      return true;
    }

    try {
      positionMenu(pointerEvent)

      window.removeEventListener('blur', hideContextMenu);
      document.body.removeEventListener('click', hideContextMenu);

      window.addEventListener('blur', hideContextMenu);
      document.body.addEventListener('click', hideContextMenu);

      volantis.scroll.push(hideContextMenu);
    } catch (error) {
      console.error('Error positioning menu:', error);
      return true;
    }
  });

  /**
   * 阻止右键菜单上的右键行为
   */
  menuContainer.addEventListener('contextmenu', event => {
    event.stopPropagation();
    event.preventDefault();
    return false;
  });

  /**
   * 菜单项点击事件（事件委托）
   */
  menuContainer.addEventListener('click', event => {
    const navigation = event.target.closest('.menuNavigation-Content a'); // 导航栏
    const menuContent = event.target.closest('.menuLoad-Content span'); // 菜单项
    const targetElement = navigation || menuContent;

    if (targetElement && targetElement.dataset.eventName && targetElement.dataset.id) {
      handleEvent(targetElement.dataset.id, targetElement.dataset.eventName, event);
    }
    // else 普通链接型 无需处理
  });

  /**
   * Pjax 回调事件
   */
  try {
    volantis.pjax.send(() => {
      hideContextMenu();
      if (!this.readModeStylesheet.disabled) {
        eventHandlers.readMode()
      }
    })
  } catch (error) {
    console.error(`Pjax error: ${error}`)
  }
}

/**
 * 初始化加载
 */
if (document.readyState !== 'loading') {
  contextMenuManager.initializeContextMenu();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    contextMenuManager.initializeContextMenu();
  });
}
