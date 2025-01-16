document.addEventListener("error", function (e) {
  const elem = e.target;
  if (elem.tagName.toLowerCase() !== 'img') {
    return;
  }

  const parentElem = elem.parentElement;
  const parentElemClass = parentElem.className;
  const pParentElemClass = parentElem.parentElement.className;

  elem.classList.add('fix-cursor-default', 'error');

  if (parentElemClass === 'fancybox' && pParentElemClass === 'fancybox') {
    parentElem.parentElement.classList.add('hideFancybox');
    parentElem.parentElement.classList.remove('fancybox');
    parentElem.classList.remove('fancybox');
  } else if (parentElemClass === 'img-bg' && pParentElemClass === 'img-wrap') {
    parentElem.parentElement.classList.add('hideFancybox');
  } else if (parentElemClass === 'author') {
    parentElem.parentElement.classList.add('fix-author-imgError');
  } else if (parentElemClass.includes('tk-avatar')) {
    parentElem.parentElement.classList.add('fix-avatar-imgError');
  }
}, true);

document.addEventListener("DOMContentLoaded", () => {
  volantis.requestAnimationFrame(() => {
    VolantisApp.init();
    VolantisApp.subscribe();

    const fancyBoxInstance = new VolantisFancyBox();
    fancyBoxInstance.bind('#post-body img:not([fancybox])');
    window.lazyLoader = new LazyLoader("picture.lazy img");

    Tools.locationHash();
    Tools.changeTitle();
    Tools.toggleGrayscaleEffect();
    highlightKeyWords.startFromURL();
    volantis.pjax.push(() => {
      VolantisApp.pjaxReload();

      window.lazyLoader.reinitObserver();
      fancyBoxInstance.bind('#post-body img:not([fancybox])');

      Tools.changeTitle();
      Tools.toggleGrayscaleEffect();
      highlightKeyWords.startFromURL();
    }, 'app.js');

    volantis.pjax.send(() => {
      volantis.dom.switcher?.removeClass('active'); // 关闭移动端激活的搜索框
      volantis.dom.header?.removeClass('z_search-open'); // 关闭移动端激活的搜索框
      volantis.dom.wrapper?.removeClass('sub'); // 跳转页面时关闭二级导航
      volantis.EventListener?.remove(); // 移除事件监听器 see: layout/_partial/scripts/global.ejs
    }, 'app.js');
  });
});

const Tools = {
  handleTitleChange: (originalTitle) => {
    const storedTitle = sessionStorage.getItem("domTitle") || originalTitle;
    const titleParts = storedTitle.split(' - ');
    document.title = document.visibilityState === 'hidden'
      ? (titleParts.length === 2 ? titleParts[1] : titleParts[0])
      : storedTitle;
  },
  changeTitle: () => {
    const originalTitle = document.title;
    const handleChange = () => Tools.handleTitleChange(originalTitle);
    sessionStorage.setItem("domTitle", originalTitle);

    document.removeEventListener('visibilitychange', handleChange); 
    window.removeEventListener('beforeunload', handleChange); 
    document.addEventListener('visibilitychange', handleChange); 
    window.addEventListener('beforeunload', handleChange);
  },
  toggleGrayscaleEffect: (isTestMode = false) => {
    const pathName = window.location.pathname;
    const current = new Date();
    const year = current.getFullYear();
  
    const dateRanges = [
      [`${year}/4/4`, `${year}/4/5`],
      [`${year}/12/13`, `${year}/12/14`]
    ];
  
    const isDateBetween = dateRanges.some(([start, end]) =>
      current >= new Date(start) && current < new Date(end)
    );
  
    const shouldApplyGrayscale = pathName === "/" && (isDateBetween || isTestMode);
  
    if (shouldApplyGrayscale) {
      document.querySelector('html').classList.add('grayscale');
    } else {
      document.querySelector('html').classList.remove('grayscale');
    }
  },
  locationHash: () => {
    if (window.location.hash) {
      const locationID = decodeURI(window.location.hash.slice(1)).replace(/\s/g, '-');
      const target = document.getElementById(locationID);
      if (target) {
        setTimeout(() => {
          const offset = target.id == 'comments' ? 0 : 80;
          volantis.scroll.to(target, { addTop: offset, behavior: 'smooth', observer: true });
        }, 500);
      }
    }
  }
}

/* Main */
const VolantisApp = (() => {
  const fn = {},
    COPYHTML = '<button class="btn-copy" data-clipboard-snippet=""><span>COPY</span></button>';
  let scrollCorrection = 80;

  fn.init = () => {
    if (volantis.dom.header) {
      scrollCorrection = volantis.dom.header.clientHeight + 16;
    }
    window.onresize = () => {
      const isMobile = document.documentElement.clientWidth < 500 ? 1 : 0;
      if (volantis.isMobile !== isMobile) {
        volantis.isMobile = isMobile;
        fn.setGlobalHeaderMenuEvent();
        fn.setHeader();
        fn.setHeaderSearch();
      }
    }

    volantis.scroll.push(volantis.scroll.debounce(fn.scrollEventCallBack, 200), "scrollEventCallBack");
  }

  fn.event = () => {
    volantis.dom.$(document.getElementById("scroll-down"))?.on('click', function () {
      fn.scrolltoElement(volantis.dom.bodyAnchor);
    });

    // 如果 sidebar 为空，隐藏 sidebar。
    const sidebar = document.querySelector("#l_side");
    if (sidebar && !sidebar.querySelectorAll("section").length) {
      document.querySelector("#l_main").classList.add("no_sidebar");
    }

    // 站点信息 最后活动日期
    const sidebarConfig = volantis.GLOBAL_CONFIG.sidebar;
    if (sidebarConfig.for_page.includes('webinfo') || sidebarConfig.for_post.includes('webinfo')) {
      const lastupd = sidebarConfig.webinfo.lastupd;
      const lastUpdateShow = document.getElementById('last-update-show');
      if (lastUpdateShow && lastupd.enable && lastupd.friendlyShow) {
        lastUpdateShow.innerHTML = fn.utilTimeAgo(volantis.GLOBAL_CONFIG.lastupdate);
      }
    }

    // 站点信息 运行时间
    const runtimeCount = document.getElementById('webinfo-runtime-count');
    if (runtimeCount) {
      const BirthDay = new Date(sidebarConfig.webinfo.runtime.data);
      const timeOld = new Date().getTime() - BirthDay.getTime();
      const daysOld = Math.floor(timeOld / (24 * 60 * 60 * 1000));
      runtimeCount.innerHTML = `${(daysOld / 365).toFixed(2)} ${sidebarConfig.webinfo.runtime.unit}`;
      runtimeCount.title = `${runtimeCount.title} 👾 ${daysOld} 天`;
    }

    // NextSite 侧边栏绑定事件
    document.querySelector('.nextsite div.site-nav-toggle')?.addEventListener('click', () => {
      const menu = document.querySelector('.nextsite nav.site-nav');
      if (menu) {
        menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
      }
    });

    // 为评论添加点击事件
    const linksComments = document.querySelectorAll('a[href$="#comments"]');
    linksComments.forEach(link => {
      const comments = document.querySelector('#comments');
      if (comments) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          volantis.scroll.to(comments, { addTop: 0, behavior: 'smooth', observer: true });
        });
      }
    })
  }

  fn.restData = () => {
    const header = volantis.dom.header;
    scrollCorrection = header ? header.clientHeight : 80;
  }

  fn.setIsMobile = () => {
    const isMobile = document.documentElement.clientWidth < 500 ? 1 : 0;
    volantis.isMobile = isMobile;
    volantis.isMobileOld = isMobile;
  }

  // 校正页面定位（被导航栏挡住的区域）
  fn.scrolltoElement = (elem, correction = scrollCorrection) => {
    const topOffset = elem.getBoundingClientRect().top + document.documentElement.scrollTop - correction;
    volantis.scroll.to(elem, { top: topOffset });
  }

  // 滚动事件回调们
  fn.scrollEventCallBack = () => {
    // 【移动端 PC】//////////////////////////////////////////////////////////////////////

    // 显示/隐藏 Header导航 topBtn 【移动端 PC】
    const showHeaderPoint = volantis.dom.bodyAnchor.offsetTop - scrollCorrection;
    const scrollTop = volantis.scroll.getScrollTop(); // 滚动条距离顶部的距离

    // topBtn
    if (volantis.dom.topBtn) {
      const topBtn = volantis.dom.topBtn;
      if (scrollTop > volantis.dom.bodyAnchor.offsetTop) {
        topBtn.addClass('show');
        if (volantis.scroll.del <= 0) {
          topBtn.classList.add('hl'); // 向上滚动高亮 topBtn
        } else {
          topBtn.classList.remove('hl');
        }
      } else {
        topBtn.removeClass('show hl');
      }
    }

    // Header导航
    if (volantis.dom.header) {
      volantis.dom.header.toggleClass('show', scrollTop - showHeaderPoint > -1);
    }

    // 决定一二级导航栏的切换 【向上滚动切换为一级导航栏；向下滚动切换为二级导航栏】  【移动端 PC】
    if (pdata.ispage && volantis.dom.wrapper) {
      const wrapper = volantis.dom.wrapper;
      if (volantis.scroll.del > 0 && scrollTop > 100) { // 向下滚动
        wrapper.addClass('sub'); // <---- 二级导航显示
      } else if (volantis.scroll.del < 0) { // 向上滚动
        wrapper.removeClass('sub'); // <---- 取消二级导航显示 一级导航显示
      }
    }

    // 【移动端】//////////////////////////////////////////////////////////////////////
    if (volantis.isMobile) {
      // 【移动端】 页面滚动 隐藏 移动端toc目录按钮
      if (pdata.ispage && volantis.dom.tocTarget && volantis.dom.toc) {
        volantis.dom.tocTarget.removeClass('active');
        volantis.dom.toc.removeClass('active');
      }
      // 【移动端】 滚动时隐藏子菜单
      if (volantis.dom.mPhoneList) {
        volantis.dom.mPhoneList.forEach(e => volantis.dom.$(e).hide());
      }
    }
  }

  // 设置滚动锚点
  fn.setScrollAnchor = () => {
    // click topBtn 滚动至bodyAnchor 【移动端 PC】
    if (volantis.dom.topBtn && volantis.dom.bodyAnchor) {
      volantis.dom.topBtn.click(e => {
        e.preventDefault();
        e.stopPropagation();
        fn.scrolltoElement(volantis.dom.bodyAnchor);
        e.stopImmediatePropagation();
      });
    }
  }

  // 设置导航栏
  fn.setHeader = () => {
    // !!! 此处的Dom对象需要重载 !!!
    if (!pdata.ispage) return;

    // 填充二级导航文章标题 【移动端 PC】
    volantis.dom.wrapper?.find('.nav-sub .title')?.html(document.title.split(" - ")[0]);

    // ====== 绑定每个按钮的事件 =========
    // 评论按钮 【移动端 PC】
    volantis.dom.comment = volantis.dom.$(document.getElementById("s-comment")); // 评论按钮  桌面端 移动端
    volantis.dom.commentTarget = volantis.dom.$(document.querySelector('#l_main article#comments')); // 评论区域
    if (volantis.dom.commentTarget && volantis.dom.comment) {
      volantis.dom.comment.click(e => { // 评论按钮点击后 跳转到评论区域
        e.preventDefault();
        e.stopPropagation();
        volantis.cleanContentVisibility();
        fn.scrolltoElement(volantis.dom.commentTarget);
        e.stopImmediatePropagation();
      });
    } else {
      if (volantis.dom.comment) { volantis.dom.comment.style.display = 'none'; }
    }

    // 移动端toc目录按钮 【移动端】
    if (volantis.isMobile) {
      volantis.dom.toc = volantis.dom.$(document.getElementById("s-toc")); // 目录按钮 仅移动端
      volantis.dom.tocTarget = volantis.dom.$(document.querySelector('#l_side .toc-wrapper')); // 侧边栏的目录列表
      if (volantis.dom.tocTarget && volantis.dom.toc) {
        // 点击移动端目录按钮 激活目录按钮 显示侧边栏的目录列表
        volantis.dom.toc.click(e => {
          e.stopPropagation();
          volantis.dom.tocTarget.toggleClass('active');
          volantis.dom.toc.toggleClass('active');
        });

        // 点击空白 隐藏
        volantis.dom.$(document).click(e => {
          e.stopPropagation();
          volantis.dom.tocTarget?.removeClass('active');
          volantis.dom.toc?.removeClass('active');
        });
      } else {
        if (volantis.dom.toc) { volantis.dom.toc.style.display = 'none'; }
      }
    }
  }

  // 设置导航栏菜单选中状态 【移动端 PC】
  fn.setHeaderMenuSelection = () => {
    // !!! 此处的Dom对象需要重载 !!!
    volantis.dom.headerMenu = volantis.dom.$(document.querySelectorAll('#l_header .navigation,#l_cover .navigation,#l_side .navigation')); // 导航列表

    // 先把已经激活的取消激活
    volantis.dom.headerMenu.forEach(element => {
      volantis.dom.$(element).find('li a.active')?.removeClass('active');
      volantis.dom.$(element).find('div a.active')?.removeClass('active');
    });

    // replace '%' '/' '.'
    let idname = location.pathname.replace(/\/|%|\./g, '') || 'home';

    // 处理分页和索引页面
    idname = idname.split(/page\d{0,}$|index.html/)[0];

    // 转义字符如 [, ], ~, #, @
    idname = idname.replace(/(\[|\]|~|#|@)/g, '\\$1');

    if (idname && volantis.dom.headerMenu) {
      volantis.dom.headerMenu.forEach(element => {
        // idname 不能为数字开头, 加一个 action- 前缀
        const id = element.querySelector(`[active-action=action-${idname}]`);
        if (id) {
          volantis.dom.$(id).addClass('active');
        }
      });
    }
  }

  // 导航栏激活设定
  fn.nextSiteMenu = () => {
    const element = document.querySelector('.widget.nextsite');
    if (!element) return;

    // 移除当前激活的菜单项 
    element.querySelector('li.menu-item-active')?.classList.remove('menu-item-active');

    // 获取idname并处理特殊字符 
    let idname = location.pathname.replace(/\/|%|\./g, '') || 'home'
    idname = idname.split(/page\d{0,}$|index.html/)[0];
    idname = idname.replace(/(\[|\]|~|#|@)/g, '\\$1');

    // 激活对应的菜单项 
    const nowItem = element.querySelector(`[active-action=action-${idname}]`);
    nowItem?.parentElement?.classList.add('menu-item-active');
  }

  // 设置全局事件
  fn.setGlobalHeaderMenuEvent = () => {
    if (volantis.isMobile) {
      // 【移动端】 关闭已经展开的子菜单 点击展开子菜单
      document.querySelectorAll('#l_header .m-phone li').forEach(li => {
        if (li.querySelector(".list-v")) {
          // 点击菜单
          volantis.dom.$(li).click(e => {
            e.stopPropagation();
            // 关闭已经展开的子菜单
            li.parentElement.childNodes.forEach(child => {
              if (child.nodeType === 1 && child.tagName === 'LI') {
                child.childNodes.forEach(grandChild => {
                  if (grandChild.nodeType === 1 && grandChild.tagName === 'UL') {
                    volantis.dom.$(grandChild).hide();
                  }
                });
              }
            });
            // 点击展开子菜单
            Array.from(li.children).forEach(child => {
              const domChild = volantis.dom.$(child);
              if (domChild.title === 'menu') {
                domChild.style.display = "flex"; // https://github.com/volantis-x/hexo-theme-volantis/issues/706
              } else {
                domChild.show();
              }
            });
          }, false); // false : pjax 不移除监听
        }
      });
    } else {
      // 【PC端】 hover时展开子菜单，点击时[target.baseURI==origin时]隐藏子菜单? 现有逻辑大部分情况不隐藏子菜单
      document.querySelectorAll('#wrapper .m-pc li > a[href]').forEach(anchor => {
        volantis.dom.$(anchor.parentElement).click(e => {
          e.stopPropagation();
          if (e.target.origin === e.target.baseURI) {
            document.querySelectorAll('#wrapper .m-pc .list-v').forEach(list => {
              volantis.dom.$(list).hide(); // 大概率不会执行
            });
          }
        }, false); // false : pjax 不移除监听
      });
    }
    fn.setPageHeaderMenuEvent();
  }

  // 【移动端】隐藏子菜单
  fn.setPageHeaderMenuEvent = () => {
    if (!volantis.isMobile) return;

    // 【移动端】 点击空白处隐藏子菜单
    volantis.dom.$(document).click((event) => {
      volantis.dom.mPhoneList.forEach((menuItem) => {
        volantis.dom.$(menuItem).hide();
      });
    });
  }

  // 设置导航栏搜索框 【移动端】
  fn.setHeaderSearch = () => {
    if (!volantis.isMobile || !volantis.dom.switcher) return;

    // 点击移动端搜索按钮
    volantis.dom.switcher.click((e) => {
      e.stopPropagation();
      volantis.dom.header.toggleClass('z_search-open'); // 激活移动端搜索框
      volantis.dom.switcher.toggleClass('active'); // 移动端搜索按钮
    }, false); // false : pjax 不移除监听

    // 点击空白取消激活
    volantis.dom.$(document).click((e) => {
      volantis.dom.header.removeClass('z_search-open');
      volantis.dom.switcher.removeClass('active');
    }, false); // false : pjax 不移除监听

    // 移动端点击搜索框 停止事件传播
    volantis.dom.search.click((e) => {
      e.stopPropagation();
    }, false); // false : pjax 不移除监听
  }

  // 设置 tabs 标签  【移动端 PC】
  fn.setTabs = () => {
    const tabs = document.querySelectorAll('#l_main .tabs .nav-tabs, .widget .tabs .nav-tabs');
    if (!tabs) return;

    tabs.forEach(tab => {
      tab.querySelectorAll('a').forEach(link => {
        volantis.dom.$(link).on('click', event => {
          event.preventDefault();
          event.stopPropagation();

          const $tab = volantis.dom.$(link.closest('.tabs'));
          $tab.find('.nav-tabs .active').removeClass('active');
          volantis.dom.$(link.parentElement).addClass('active');
          $tab.find('.tab-content .active').removeClass('active');
          $tab.find(event.currentTarget.className).addClass('active');
          return false;
        });
      });
    });
  }

  // hexo-reference 页脚跳转 https://github.com/volantis-x/hexo-theme-volantis/issues/647
  fn.footnotes = () => {
    document.querySelectorAll('#l_main .footnote-backref, #l_main .footnote-ref > a').forEach(e => {
      e.onclick = null; // 强制清空原 click 事件
      volantis.dom.$(e).on('click', event => {
        event.stopPropagation();
        event.preventDefault();
        const targetID = decodeURI(event.target.hash.slice(1)).replace(/\s/g, '-');
        const target = document.getElementById(targetID);
        if (target) {
          volantis.scroll.to(target, { addTop: - 5, behavior: 'smooth' });
        }
      });
    });
  }

  // 工具类：代码块复制
  fn.utilCopyCode = (Selector) => {
    document.querySelectorAll(Selector).forEach(node => {
      node.insertAdjacentHTML("beforebegin", COPYHTML);
      const _BtnCopy = node.previousSibling;
      _BtnCopy.onclick = e => {
        e.stopPropagation();
        const _span = _BtnCopy.querySelector('span');

        node.focus();
        const range = new Range();
        range.selectNodeContents(node);
        const selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const str = selection.toString();
        fn.utilWriteClipText(str);
      };
    });
  }

  // 工具类：复制字符串到剪切板
  fn.utilWriteClipText = (str) => {
    NProgress?.start();
    return navigator.clipboard.writeText(str).catch(e => {
      const input = document.createElement('textarea');
      input.setAttribute('readonly', 'readonly');
      document.body.appendChild(input);
      input.value = str;
      input.select();
      try {
        const result = document.execCommand('copy');
        document.body.removeChild(input);
        if (!result) throw new Error('复制文本失败!');
      } catch (e) {
        document.body.removeChild(input);
        throw new Error('当前浏览器不支持复制功能，请检查更新或更换其他浏览器操作!');
      }
      NProgress?.done();
    }).finally(() => {
      NProgress?.done();
    });
  }

  // 工具类：返回时间间隔
  fn.utilTimeAgo = (date, limit = 30) => {
    try {
      const diffValue = Date.now() - date.getTime();
      const days = Math.floor(diffValue / (24 * 3600 * 1000));

      if (days === 0) {
        const hours = Math.floor((diffValue % (24 * 3600 * 1000)) / (3600 * 1000));
        if (hours === 0) {
          const minutes = Math.floor((diffValue % (3600 * 1000)) / (60 * 1000));
          if (minutes === 0) {
            const seconds = Math.round((diffValue % (60 * 1000)) / 1000);
            return `${seconds} 秒前`;
          }
          return `${minutes} 分钟前`;
        }
        return `${hours} 小时前`;
      }

      if (days < 0) return '刚刚';
      if (days < limit) return `${days} 天前`;

      const Nyear = date.getFullYear();
      const Nmonth = String(date.getMonth() + 1).padStart(2, '0');
      const Ndate = String(date.getDate()).padStart(2, '0');
      return `${Nyear}年${Nmonth}月${Ndate}日`;

    } catch (error) {
      console.error(error);
      return ' - ';
    }
  }

  // feather 图标
  fn.feather = () => {
    if (feather) {
      try {
        feather.replace({ width: 16, height: 16 });
      } catch (error) {
        console.error('图标加载失败', error);
      }
    }
  }

  // 转换时间
  fn.dataToShow = () => {
    document.querySelectorAll('.dataToShow').forEach(item => {
      try {
        const time = fn.utilTimeAgo(new Date(item.getAttribute('datetime')), 60).trim();
        item.textContent = time || item.textContent;
      } catch (error) {
        console.error(error);
      }
    });
  }

  return {
    init: () => {
      fn.init();
      fn.event();
    },
    subscribe: () => {
      fn.setIsMobile();
      fn.setHeader();
      fn.setHeaderMenuSelection();
      fn.setGlobalHeaderMenuEvent();
      fn.setHeaderSearch();
      fn.setScrollAnchor();
      fn.setTabs();
      fn.footnotes();
      fn.dataToShow();
      fn.nextSiteMenu();
      fn.feather();
    },
    pjaxReload: () => {
      fn.event();
      fn.restData();
      fn.setHeader();
      fn.setHeaderMenuSelection();
      fn.setPageHeaderMenuEvent();
      fn.setScrollAnchor();
      fn.setTabs();
      fn.footnotes();
      fn.dataToShow();
      fn.nextSiteMenu();
      fn.feather();

      // 移除小尾巴的移除
      const navMain = document.querySelector("#l_header .nav-main");
      navMain?.querySelectorAll('.list-v:not(.menu-phone)')?.forEach(e => e.removeAttribute("style"));
      document.querySelector("#l_header .menu-phone.list-v")?.removeAttribute("style");
    },
    utilCopyCode: fn.utilCopyCode,
    utilWriteClipText: fn.utilWriteClipText,
    utilTimeAgo: fn.utilTimeAgo,
    scrolltoElement: fn.scrolltoElement
  }
})()
Object.freeze(VolantisApp);


// highlightKeyWords 与 搜索功能搭配 https://github.com/next-theme/hexo-theme-next/blob/eb194a7258058302baf59f02d4b80b6655338b01/source/js/third-party/search/local-search.js
// Question: 锚点稳定性未知
// ToDo: 查找模式
// 0. (/////////要知道浏览器自带全页面查找功能 CTRL + F)
// 1. 右键开启查找模式 / 导航栏菜单开启?? / CTRL + F ???
// 2. 查找模式面板 (可拖动? or 固定?)
// 3. keyword mark id 从 0 开始编号 查找下一处 highlightKeyWords.scrollToNextHighlightKeywordMark() 查找上一处 scrollToPrevHighlightKeywordMark() 循环查找(取模%)
// 4. 可输入修改 查找关键词 keywords(type:list)
// 5. 区分大小写 caseSensitive (/ 全字匹配?? / 正则匹配??)
// 6. 在选定区域中查找 querySelector ??
// 7. 关闭查找模式
// 8. 搜索跳转 (URL 入口) 自动开启查找模式 调用 scrollToNextHighlightKeywordMark()
const highlightKeyWords = (() => {
  let markNum = 0;
  let markNextId = -1;

  const startFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const keyword = decodeURI(params.get('keyword'));
    const keywords = keyword ? keyword.split(' ') : [];
    const post = document.querySelector('#l_main');
    if (keywords.length === 1 && keywords[0] === "null") return;
    start(keywords, post);
    scrollToFirstHighlightKeywordMark();
  };

  const scrollToFirstHighlightKeywordMark = () => {
    const target = scrollToNextHighlightKeywordMark("0");
    if (!target) {
      requestAnimationFrame(scrollToFirstHighlightKeywordMark);
    }
  };

  const scrollToNextHighlightKeywordMark = (id) => {
    const input = id || (markNextId + 1) % markNum;
    markNextId = parseInt(input, 10);
    let target = document.getElementById(`keyword-mark-${markNextId}`);
    if (!target) {
      markNextId = (markNextId + 1) % markNum;
      target = document.getElementById(`keyword-mark-${markNextId}`);
    }
    if (target) {
      volantis.scroll.to(target, {
        addTop: -10,
        behavior: 'smooth'
      });
      document.querySelector('.highlighted')?.classList.remove('highlighted');
      target.classList.add('highlighted');
    }
    return target;
  };

  const scrollToPrevHighlightKeywordMark = (id) => {
    const input = id || (markNextId - 1 + markNum) % markNum;
    markNextId = parseInt(input, 10);
    let target = document.getElementById(`keyword-mark-${markNextId}`);
    if (!target) {
      markNextId = (markNextId - 1 + markNum) % markNum;
      target = document.getElementById(`keyword-mark-${markNextId}`);
    }
    if (target) {
      const tempHeight = document.querySelector('#s-top') ? document.querySelector('#s-top').offsetHeight : 0;
      volantis.scroll.to(target, {
        addTop: -10,
        behavior: 'smooth'
      });
      document.querySelector('.highlighted')?.classList.remove('highlighted');
      target.classList.add('highlighted');
    }
    return target;
  };

  const start = (keywords, querySelector) => {
    markNum = 0;
    if (!keywords.length || !querySelector || (keywords.length === 1 && keywords[0] === "null")) return;
    const walk = document.createTreeWalker(querySelector, NodeFilter.SHOW_TEXT, null);
    const allNodes = [];
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea')) {
        allNodes.push(walk.currentNode);
      }
    }
    allNodes.forEach(node => {
      const [indexOfNode] = getIndexByWord(keywords, node.nodeValue);
      if (!indexOfNode.length) return;
      const slice = mergeIntoSlice(0, node.nodeValue.length, indexOfNode);
      highlightText(node, slice, 'keyword');
    });
  };

  const getIndexByWord = (words, text, caseSensitive = false) => {
    const index = [];
    const included = new Set();
    const lowerText = caseSensitive ? text : text.toLowerCase();
    words.forEach(word => {
      const div = document.createElement('div');
      div.innerText = word;
      word = caseSensitive ? div.innerHTML : div.innerHTML.toLowerCase();
      const wordLen = word.length;
      if (wordLen === 0) return;
      let startPosition = 0;
      let position;
      while ((position = lowerText.indexOf(word, startPosition)) > -1) {
        index.push({ position, word });
        included.add(word);
        startPosition = position + wordLen;
      }
    });
    index.sort((left, right) => left.position - right.position || right.word.length - left.word.length);
    return [index, included];
  };

  const mergeIntoSlice = (start, end, index) => {
    const hits = [];
    const count = new Set();
    while (index.length) {
      const { position, word } = index[0];
      if (position + word.length > end) break;
      count.add(word);
      hits.push({ position, length: word.length });
      index.shift();
      while (index.length && index[0].position < position + word.length) index.shift();
    }
    return { hits, start, end, count: count.size };
  };

  const highlightText = (node, slice, className) => {
    const val = node.nodeValue;
    let index = slice.start;
    const children = [];
    for (const { position, length } of slice.hits) {
      children.push(document.createTextNode(val.substring(index, position)));
      const mark = document.createElement('mark');
      mark.appendChild(document.createTextNode(val.substr(position, length)));
      mark.className = className;
      highlightStyle(mark);
      children.push(mark);
      index = position + length;
    }
    node.nodeValue = val.substring(index, slice.end);
    children.forEach(child => node.parentNode.insertBefore(child, node));
  };

  const highlightStyle = (mark) => {
    if (!mark) return;
    mark.id = `keyword-mark-${markNum++}`;
    mark.classList.add('highlightKey')
    return mark;
  };

  const cleanHighlightStyle = () => {
    document.querySelectorAll(".keyword").forEach(mark => {
      mark.classList.remove('highlightKey')
    });
  };

  return {
    start,
    startFromURL,
    scrollToNextHighlightKeywordMark,
    scrollToPrevHighlightKeywordMark,
    cleanHighlightStyle
  };
})();

/* FancyBox */
class VolantisFancyBox {
  constructor(checkMain = true) {
    this.option = {
      Hash: false,
      groupAll: true,
      caption: (fancybox, slide) => slide.thumbEl?.alt || "",
      wheel: "slide",
      contentClick: 'iterateZoom',
      Thumbs: {
        showOnStart: false
      },
      Images: {
        content: (_ref, slide) => {
          const imgElement = slide.thumbEl;
          const pictureElement = imgElement.closest('picture');
          if (imgElement.hasAttribute('data-src')) {
            imgElement.setAttribute('src', imgElement.getAttribute('data-src'));
          }
          if (pictureElement) {
            pictureElement.classList.remove("lazy");
            let sources = pictureElement.getElementsByTagName('source');
            for (let source of sources) {
              if (source.hasAttribute('data-srcset')) {
                source.setAttribute('srcset', source.getAttribute('data-srcset'));
              }
            }
            return pictureElement.outerHTML;
          } else {
            return imgElement.outerHTML;
          }
        },
        Panzoom: {
          maxScale: 1.5,
          panMode: "mousemove",
          mouseMoveFactor: 1.1,
          mouseMoveFriction: 0.12,
        }
      },
      Toolbar: {
        display: {
          left: ["infobar"],
          middle: [
            "zoomIn",
            "zoomOut",
            "toggle1to1",
            "rotateCCW",
            "rotateCW",
            "flipX",
            "flipY",
          ],
          right: ["slideshow", "download", "thumbs", "close"],
        },
      }
    };
    if (checkMain) {
      this.#init();
    }
  }

  async #init() {
    await this.loadFancybox();
    if (document.querySelector(".md .gallery img, .fancybox")) {
      this.groupBind();
    }
  }

  async loadFancybox() {
    if (typeof Fancybox === "undefined") {
      await volantis.css(volantis.GLOBAL_CONFIG.cdn.fancybox_css);
      await volantis.js(volantis.GLOBAL_CONFIG.cdn.fancybox_js);
    }
  }

  async bind(selectors) {
    await this.loadFancybox();
    if (typeof Fancybox !== 'undefined') {
      Fancybox.unbind(selectors);
      Fancybox.bind(selectors, this.option);
    }
  }

  async groupBind(selectors, groupName = 'default') {
    await this.loadFancybox();
    this.#elementHandling(selectors, groupName);
    const group = new Set();
    document.querySelectorAll('.gallery').forEach(ele => {
      if (ele.querySelector("img")) {
        group.add(ele.getAttribute('data-group') || 'default');
      }
    });
    if (groupName) group.add(groupName);
    group.forEach(name => {
      if (typeof Fancybox !== 'undefined') {
        Fancybox.unbind(`[data-fancybox="${name}"]`);
        Fancybox.bind(`[data-fancybox="${name}"]`, this.option);
      }
    });
  }

  #elementHandling(selectors, groupName) {
    if (!selectors) return;
    document.querySelectorAll(selectors).forEach($item => {
      if ($item.hasAttribute('fancybox')) return;
      $item.setAttribute('fancybox', '');
      const $link = document.createElement('a');
      $link.setAttribute('href', $item.src || $item.dataset?.src);
      $link.setAttribute('data-caption', $item.alt || '');
      $link.setAttribute('data-fancybox', groupName);
      $link.classList.add('fancybox');
      $link.append($item.cloneNode());
      $item.replaceWith($link);
    });
  }
}

/* 图片懒加载 */
class LazyLoader {
  constructor(selector) {
    this.lazyPictureObserver = null;
    this.observedElements = new Set();
    this.selector = selector;
    this.initObserver();
    this.observeElements();
  }

  // 初始化观察器
  initObserver() {
    this.lazyPictureObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && (!volantis?.scroll || !volantis?.scroll?.isScrolling)) {
          this.loadImage(entry.target);
          this.lazyPictureObserver.unobserve(entry.target);
          this.observedElements.delete(entry.target);
        }
      });
    });
  }

  // 开始观察元素
  observeElement(element) {
    if (!this.observedElements.has(element)) {
      this.lazyPictureObserver.observe(element);
      this.observedElements.add(element);
    }
  }

  // 观察所有符合选择器的元素
  observeElements() {
    document.querySelectorAll(this.selector).forEach(element => {
      this.observeElement(element);
    });
  }

  // 加载图片
  loadImage(lazyImage) {
    let sources = lazyImage.parentElement.getElementsByTagName('source');
    for (let source of sources) {
      source.srcset = source.dataset.srcset;
    }
    lazyImage.src = lazyImage.dataset.src;
    lazyImage.onload = function () {
      const pictureElement = lazyImage.closest('picture');
      pictureElement.classList.remove("lazy");
    };
  }

  // 卸载所有观察器
  unobserveAll() {
    if (this.lazyPictureObserver) {
      this.lazyPictureObserver.disconnect();
      this.observedElements.clear();
    }
  }

  // 重新初始化观察器并观察新元素
  reinitObserver() {
    this.unobserveAll();
    this.initObserver();
    this.observeElements();
  }
}
