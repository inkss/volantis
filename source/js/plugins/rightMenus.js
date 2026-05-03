const contextMenuManager = {
  urlRegx: /^(https?:\/\/)?([A-Za-z0-9.-]+)\.([A-Za-z]{2,})(\/[A-Za-z0-9.-]*)*\/?(\?[A-Za-z0-9&=_-]*)?(#[A-Za-z0-9-_]*)?$/,
  rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
  maxMenuItems: 0,
  isClipboardReadAllowed: true,
  menuContainer: null,
  menuItems: [],
  navigationItems: []
};

// 公共数据
const globalData = {
  pointerEvent: null,  // 右键事件
  linkAddress: null,   // 链接地址
  selectedText: null,  // 选取文本
  inputContent: null   // 输入框
};

// 生成菜单 HTML
contextMenuManager.generateMenuHTML = function(config) {
  // 检查是否已存在，避免重复添加
  if (document.getElementById('rightmenu-wrapper')) {
    return;
  }

  // 创建容器
  const wrapper = document.createElement('div');
  wrapper.id = 'rightmenu-wrapper';
  wrapper.dataset.maxMenuItems = config.options.maxMenuItems || 12;

  const menuContent = document.createElement('ul');
  menuContent.className = 'rightmenu-list';
  menuContent.id = 'rightmenu-content';

  let html = '';

  // 处理 feather 图标
  const processIcon = (iconStr) => {
    if (!iconStr) return '';
    const classList = iconStr.split(' ');
    const featherIndex = classList.indexOf('feather');
    if (featherIndex !== -1 && featherIndex + 1 < classList.length) {
      const dataFeatherValue = classList[featherIndex + 1];
      classList.splice(featherIndex, 2);
      const newClass = classList.join(' ').trim();
      return `data-feather="${dataFeatherValue}" class="${newClass}"`;
    }
    return `class="${iconStr}"`;
  };

  // 生成导航栏
  if (config.options.navigation && config.navigation.length > 0) {
    html += '<li class="navigation menuNavigation-Content">';
    config.navigation.forEach(item => {
      if (item.link === undefined) {
        html += `<a data-id="${item.id}" class="rightmenu-icon-only" rel="nofollow" data-event-name="${item.eventName}" data-display-condition="${item.displayCondition || ''}">`;
        html += `<i ${processIcon(item.icon)}></i>`;
        html += '</a>';
      } else {
        const linkTarget = item.linkTarget || '_self';
        html += `<a data-id="${item.id}" class="rightmenu-icon-only" rel="nofollow" href="${item.link}" target="${linkTarget}" data-display-condition="${item.displayCondition || ''}">`;
        html += `<i ${processIcon(item.icon)}></i>`;
        html += '</a>';
      }
    });
    html += '</li>';
    html += '<li class="menuLoad-Content active"><hr></li>';
  }

  // 生成菜单列表
  const autoDividerEnabled = config.menuList.some(item => item === 'hr' || item.id === undefined || item.id === 'hr');
  let lastDisplayCondition = null;

  config.menuList.forEach((item, index) => {
    if (autoDividerEnabled) {
      if (item === 'hr' || item.id === undefined || item.id === 'hr') {
        html += '<li class="menuLoad-Content"><hr></li>';
        return;
      }
    } else {
      if (index > 0 && item.displayCondition !== lastDisplayCondition) {
        html += '<li class="menuLoad-Content"><hr></li>';
      }
    }
    lastDisplayCondition = item.displayCondition;

    if (item.link === undefined) {
      html += '<li class="menuLoad-Content">';
      html += `<span class="rightmenu-item" data-id="${item.id}" data-event-name="${item.eventName}" data-display-condition="${item.displayCondition || ''}">`;
      html += `<i ${processIcon(item.icon)}></i>`;
      html += item.name;
      html += '</span>';
      html += '</li>';
    } else {
      const linkTarget = item.linkTarget || '_self';
      html += '<li class="menuLoad-Content">';
      html += `<a class="rightmenu-item" data-id="${item.id}" href="${item.link}" target="${linkTarget}" data-display-condition="${item.displayCondition || ''}">`;
      html += `<i ${processIcon(item.icon)}></i>`;
      html += item.name;
      html += '</a>';
      html += '</li>';
    }
  });

  menuContent.innerHTML = html;
  wrapper.appendChild(menuContent);
  document.body.appendChild(wrapper);
  this.menuContainer = wrapper;

  // 调用 feather.replace()
  if (typeof feather !== 'undefined') {
    feather.replace({ width: 16, height: 16 });
  }
};

// 初始化自定义右键菜单的函数
contextMenuManager.initializeContextMenu = async function () {
  // 加载配置并生成 HTML
  try {
    const response = await fetch('/rightmenus.json');
    const config = await response.json();
    // 过滤未加载功能的菜单项
    if (!volantis.readmode) {
      config.menuList = config.menuList.filter(item => item.id !== 'readMode');
    }
    if (!volantis.printmode) {
      config.menuList = config.menuList.filter(item => item.id !== 'printMode');
    }
    this.generateMenuHTML(config);
  } catch (error) {
    console.error('Failed to load rightmenus config:', error);
    return;
  }

  this.menuContainer = document.getElementById('rightmenu-wrapper');
  if (!this.menuContainer) return;

  this.maxMenuItems = Number(this.menuContainer.dataset.maxMenuItems) || 12;

  // 右键导航项
  this.navigationItems = [];
  const navLinks = this.menuContainer.querySelectorAll('.navigation.menuNavigation-Content a');
  for (let i = 0; i < navLinks.length; i++) {
    const item = navLinks[i];
    this.navigationItems.push({
      id: item.dataset.id,
      displayCondition: item.dataset.displayCondition,
      menuContentElement: item
    });
  }

  // 右键菜单项  
  this.menuItems = [];
  const menuContents = this.menuContainer.querySelectorAll('.menuLoad-Content');
  for (let i = 0; i < menuContents.length; i++) {
    const item = menuContents[i];
    const elem = item.firstElementChild;
    if (elem) {
      this.menuItems.push({
        id: elem.dataset.id,
        link: elem.href,
        linkTarget: elem.target,
        eventName: elem.dataset.eventName,
        displayCondition: elem.dataset.displayCondition,
        isHrElement: elem.tagName === 'HR',
        menuContentElement: item
      });
    }
  }

  // 预设条件
  const conditions = {
    inInputField: (menuItem, pointerEvent) => {
      const target = pointerEvent.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        globalData.inputContent = target;
        globalData.selectedText = window.getSelection().toString();
        
        switch (menuItem.id) {
          case 'selectAllText':
            return globalData.inputContent.value !== '';
          case 'cutText':
            return globalData.selectedText !== '';
          case 'copyPaste':
            return contextMenuManager.isClipboardReadAllowed;
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
      // 检查选中的文本是否是链接
      if (contextMenuManager.urlRegx.test(globalData.selectedText)) {
        globalData.linkAddress = globalData.selectedText;
        return true;
      }
      
      const target = pointerEvent.target;
      // 检查目标是否是链接
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        globalData.linkAddress = target.href;
        return true;
      }
      // 检查目标是否是图片
      if (target.tagName === 'IMG' && target.hasAttribute('src')) {
        globalData.linkAddress = target.src;
        return true;
      }
      return false;
    },
    articlePage: (menuItem) => {
      if (menuItem.id === 'prev' || menuItem.id === 'next') {
        return !!document.querySelector(`article .prev-next a.${menuItem.id}`);
      }

      if (menuItem.id === 'comment') {
        const element = document.querySelector('#comments');
        if (!element) return false;
        
        // 校验元素存在，页面中显示，屏幕上显示
        const isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
        const isBelowViewport = window.scrollY < (element.getBoundingClientRect().top - 50 + window.scrollY);
        return isVisible && isBelowViewport;
      }
      
      return !!document.querySelector('#post.article');
    },
    scrolledFromTop: () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const halfScreenHeight = window.innerHeight / 2;
      return scrollTop >= halfScreenHeight;
    },
    homePage: () => {
      return new URL(window.location.href).pathname !== '/';
    }
  };

  // 预设事件
  const eventHandlers = {
    scrollTop: () => {
      if (typeof VolantisApp?.scrolltoElement === 'function' && volantis.dom?.bodyAnchor) {
        VolantisApp.scrolltoElement(volantis.dom.bodyAnchor);
      } else if (typeof volantis?.scroll?.to === 'function' && volantis.dom?.bodyAnchor) {
        volantis.scroll.to(volantis.dom.bodyAnchor);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    scrollComment: () => {
      const element = document.querySelector('#comments');
      if (!element) return;
      
      const l_header = document.querySelector('#l_header');
      const headerTotalOffset = l_header ? -contextMenuManager.rem - l_header.offsetHeight : 0;
      
      if (typeof volantis?.scroll?.to === 'function') {
        volantis.scroll.to(element, { addTop: headerTotalOffset });
      } else {
        window.scrollTo({ 
          top: element.getBoundingClientRect().top + window.scrollY - headerTotalOffset, 
          behavior: 'smooth' 
        });
      }
    },
    jumpArticle: (menuItem) => {
      const item = document.querySelector(`.prev-next a.${menuItem.id}`);
      if (!item) return;

      const href = item.href;
      if (typeof pjax !== 'undefined') {
        pjax.loadUrl(href);
      } else {
        window.location.href = href;
      }
    },
    readMode: () => {
      Fancybox?.close();
      volantis.readmode?.toggle();
    },
    printMode: () => {
      Fancybox?.close();
      volantis.printmode?.print();
    },
    copyText: () => {
      if (globalData.selectedText) {
        VolantisApp.utilWriteClipText(globalData.selectedText);
      }
    },
    copyLink: () => {
      const target = globalData.pointerEvent?.target;
      if (!target) return;
      
      let link = '';
      if (target.tagName === 'IMG') {
        link = target.dataset.src || target.src;
      } else if (target.tagName === 'A') {
        link = target.href;
      }
      
      if (link) {
        VolantisApp.utilWriteClipText(link);
      }
    },
    copyImg: (menuItem) => {
      NProgress?.start();
      try {
        const target = globalData.pointerEvent?.target;
        if (!target) {
          throw new Error(volantis.GLOBAL_CONFIG.languages.clipboard.img_target_missing);
        }
        
        const link = target.dataset.src || target.src;
        if (!link) {
          throw new Error(volantis.GLOBAL_CONFIG.languages.clipboard.img_link_missing);
        }
        
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = `${link}?(lll￢ω￢)~~`;
        image.onerror = () => {
          console.error('图片加载失败');
          NProgress?.done();
        };
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            canvas.toBlob(blob => {
              if (blob) {
                navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]).catch(err => {
                  console.error('复制图片失败:', err);
                }).finally(() => {
                  NProgress?.done();
                });
              } else {
                console.error(' canvas.toBlob 失败');
                NProgress?.done();
              }
            }, 'image/png');
          } catch (err) {
            console.error('处理图片失败:', err);
            NProgress?.done();
          }
        };
      } catch (err) {
        console.error(`Menu: ${menuItem.id}, event:[${menuItem.eventName}] error: ${err}`);
        NProgress?.done();
      }
    },
    selectAllText: () => {
      if (globalData.inputContent) {
        globalData.inputContent.select();
      }
    },
    cutText: (text) => {
      if (!globalData.inputContent) return;
      
      // 公共调用时第一个参数传递的是 Object
      let value = '';
      if (typeof text !== 'string') {
        if (globalData.selectedText) {
          VolantisApp.utilWriteClipText(globalData.selectedText);
        }
      } else {
        VolantisApp.utilWriteClipText(text);
        value = text;
      }

      const element = globalData.inputContent;
      const { selectionStart: start, selectionEnd: end, scrollTop } = element;

      element.value = `${element.value.substring(0, start)}${value}${element.value.substring(end)}`;
      element.setSelectionRange(start + value.length, start + value.length);
      element.scrollTop = scrollTop;
      element.focus();
    },
    copyPaste: async (menuItem, pointerEvent) => {
      try {
        NProgress?.start();
        
        // 检查浏览器是否支持剪贴板 API
        if (!navigator.permissions || !navigator.clipboard) {
          throw new Error(volantis.GLOBAL_CONFIG.languages.clipboard.clipboard_no_support);
        }
        
        const result = await navigator.permissions.query({ name: 'clipboard-read' });
        if (result.state === 'granted' || result.state === 'prompt') {
          const clipboardItems = await navigator.clipboard.read();

          let text = '';
          let imageFiles = [];
          
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.types.length === 0) {
              throw new Error(volantis.GLOBAL_CONFIG.languages.clipboard.clipboard_empty);
            }
            
            for (let j = 0; j < item.types.length; j++) {
              const type = item.types[j];
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

          // 处理图片文件
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dataTransfer,
              bubbles: true,
              cancelable: true
            });

            // 对剪切板中的图片尝试触发 paste 事件
            pointerEvent?.target?.dispatchEvent(pasteEvent);
          }

          contextMenuManager.isClipboardReadAllowed = true;
        } else {
          contextMenuManager.isClipboardReadAllowed = false;
          throw new Error(volantis.GLOBAL_CONFIG.languages.clipboard.clipboard_no_permission);
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
    const item = contextMenuManager.menuItems.find(item => item.eventName === eventName && item.id === id)
      || contextMenuManager.navigationItems.find(item => item.eventName === eventName && item.id === id)
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
    for (let i = 0; i < contextMenuManager.menuItems.length; i++) {
      const item = contextMenuManager.menuItems[i];
      if (evaluateCondition(item, pointerEvent)) {
        item.menuContentElement.classList.add('active');
        if (!item.isHrElement) {
          menuItemsCount++;
        }
      } else {
        item.menuContentElement.classList.remove('active');
      }
    }

    // 处理过长菜单项
    // 当总菜单项累计显示数量大于设定数量时，隐藏所有链接型菜单
    if (menuItemsCount > contextMenuManager.maxMenuItems) {
      for (let i = 0; i < contextMenuManager.menuItems.length; i++) {
        const item = contextMenuManager.menuItems[i];
        if (item.link) {
          item.menuContentElement.classList.remove('active');
        }
      }
    }

    // 处理“相邻、第一个显示、最后一个显示”的菜单分割项
    let lastSeparator = null;
    for (let i = 0; i < contextMenuManager.menuItems.length; i++) {
      const menuItem = contextMenuManager.menuItems[i];
      if (menuItem.isHrElement) {
        menuItem.menuContentElement.classList.add('active');
        if (lastSeparator) {
          lastSeparator.classList.remove('active');
        }
        lastSeparator = menuItem.menuContentElement;
      } else if (menuItem.menuContentElement.classList.contains('active')) {
        lastSeparator = null;
      }
    }
    
    if (lastSeparator) {
      lastSeparator.classList.remove('active');
    }
    
    // 处理第一个激活的菜单项是分割线的情况
    if (contextMenuManager.navigationItems.length === 0) {
      const firstActiveMenuItem = contextMenuManager.menuItems.find(item => 
        item.menuContentElement.classList.contains('active')
      );
      if (firstActiveMenuItem && firstActiveMenuItem.isHrElement) {
        firstActiveMenuItem.menuContentElement.classList.remove('active');
      }
    }

    // 处理导航栏显隐
    for (let i = 0; i < contextMenuManager.navigationItems.length; i++) {
      const menuNav = contextMenuManager.navigationItems[i];
      menuNav.menuContentElement.style.display = evaluateCondition(menuNav, pointerEvent)
        ? 'flex' : 'none';
    }
  };

  /**
   * 定位显示菜单
   * 
   * @param {PointerEvent} pointerEvent 右键事件
   */
  const positionMenu = (pointerEvent) => {
    pointerEvent.preventDefault();

    showCustomContextMenu(pointerEvent);

    contextMenuManager.menuContainer.classList.add('active');
    const { clientX: mouseClientX, clientY: mouseClientY } = pointerEvent;
    const screenWidth = document.documentElement.clientWidth || document.body.clientWidth;
    const screenHeight = document.documentElement.clientHeight || document.body.clientHeight;
    const menuWidth = contextMenuManager.menuContainer.offsetWidth;
    const menuHeight = contextMenuManager.menuContainer.offsetHeight;

    // 计算菜单位置，确保菜单不会超出屏幕
    let posX = mouseClientX + menuWidth > screenWidth 
      ? mouseClientX - menuWidth + 10 
      : mouseClientX;
    
    let posY = mouseClientY + menuHeight > screenHeight 
      ? mouseClientY - menuHeight + 10 
      : mouseClientY;
    
    // 处理菜单底部超出屏幕的情况
    if (mouseClientY + menuHeight > screenHeight && posY < menuHeight && mouseClientY < menuHeight) {
      posY += screenHeight - menuHeight - posY - 10;
    }

    contextMenuManager.menuContainer.style.left = `${posX}px`;
    contextMenuManager.menuContainer.style.top = `${posY}px`;
  };

  /**
   * 隐藏自定义右键菜单
   */
  const hideContextMenu = () => {
    if (contextMenuManager.menuContainer && contextMenuManager.menuContainer.classList.contains('active')) {
      contextMenuManager.menuContainer.classList.remove('active');
    }
  };

  /**
   * 覆盖浏览器默认右键菜单
   */
  document.addEventListener('contextmenu', (pointerEvent) => {
    hideContextMenu();
    globalData.pointerEvent = pointerEvent;
    
    // 按下Ctrl键或屏幕宽度小于等于500px时，使用默认右键菜单
    if (pointerEvent.ctrlKey || document.body.offsetWidth <= 500) {
      return true;
    }

    try {
      positionMenu(pointerEvent);

      // 移除旧的事件监听器
      window.removeEventListener('blur', hideContextMenu);
      document.body.removeEventListener('click', hideContextMenu);

      // 添加新的事件监听器
      window.addEventListener('blur', hideContextMenu);
      document.body.addEventListener('click', hideContextMenu);

      // 添加滚动事件监听器
      if (volantis?.scroll?.push) {
        volantis.scroll.push(hideContextMenu);
      }
    } catch (error) {
      console.error('Error positioning menu:', error);
      return true;
    }
  });

  /**
   * 阻止右键菜单上的右键行为
   */
  contextMenuManager.menuContainer.addEventListener('contextmenu', event => {
    event.stopPropagation();
    event.preventDefault();
    return false;
  });

  /**
   * 菜单项点击事件（事件委托）
   */
  contextMenuManager.menuContainer.addEventListener('click', event => {
    // 找到导航栏或菜单项
    const navigation = event.target.closest('.menuNavigation-Content a'); // 导航栏
    const menuContent = event.target.closest('.menuLoad-Content span'); // 菜单项
    const menuLink = event.target.closest('.menuLoad-Content a'); // 菜单项链接
    const targetElement = navigation || menuContent || menuLink;

    if (targetElement && targetElement.dataset.eventName && targetElement.dataset.id) {
      handleEvent(targetElement.dataset.id, targetElement.dataset.eventName, event);
    } else if ((navigation || menuLink) && targetElement.href && targetElement.target !== '_blank' && targetElement.target !== 'view_window') {
      // 普通链接通过 pjax 加载（包括 navigation 和 menuLink）
      event.preventDefault();
      if (typeof pjax !== 'undefined') {
        pjax.loadUrl(targetElement.href);
      } else {
        window.location.href = targetElement.href;
      }
    }
  });

  /**
   * Pjax 回调事件
   */
  try {
    if (volantis?.pjax?.send) {
      volantis.pjax.send(() => {
        hideContextMenu();
      });
    }
  } catch (error) {
    console.error(`Pjax error: ${error}`);
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
