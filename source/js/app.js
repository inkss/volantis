document.addEventListener("DOMContentLoaded", function () {
  volantis.requestAnimationFrame(() => {
    VolantisApp.init();
    VolantisApp.subscribe();
    VolantisFancyBox.init();
    VolantisFancyBox.bind('#post-body img:not([fancybox])');
    highlightKeyWords.startFromURL();
    locationHash();
    //changeTitle();

    volantis.pjax.push(() => {
      VolantisApp.pjaxReload();
      VolantisFancyBox.init();
      VolantisFancyBox.bind('#post-body img:not([fancybox])');
      sessionStorage.setItem("domTitle", document.title);
      highlightKeyWords.startFromURL();
    }, 'app.js');
    volantis.pjax.send(() => {
      volantis.dom.switcher?.removeClass('active'); // 关闭移动端激活的搜索框
      volantis.dom.header?.removeClass('z_search-open'); // 关闭移动端激活的搜索框
      volantis.dom.wrapper?.removeClass('sub'); // 跳转页面时关闭二级导航
      volantis.EventListener?.remove() // 移除事件监听器 see: layout/_partial/scripts/global.ejs
    }, 'app.js');
  });
});

// 动态修改标题
const changeTitle = () => {
  sessionStorage.setItem("domTitle", document.title);
  document.addEventListener('visibilitychange', function () {
    const title = sessionStorage.getItem("domTitle") || document.title;
    const titleArr = title.split(' - ') || [];
    if (document.visibilityState == 'hidden') {
      document.title = titleArr.length === 2 ? titleArr[1] : titleArr[0];
    } else {
      document.title = title;
    }
  });
}

/*锚点定位*/
const locationHash = () => {
  if (window.location.hash) {
    let locationID = decodeURI(window.location.hash.split('#')[1]).replace(/\ /g, '-');
    let target = document.getElementById(locationID);
    if (target) {
      setTimeout(() => {
        if (window.location.hash.startsWith('#fn')) { // hexo-reference https://github.com/volantis-x/hexo-theme-volantis/issues/647
          volantis.scroll.to(target, { addTop: - volantis.dom.header.offsetHeight - 5, behavior: 'instant', observer: true })
        } else {
          // 锚点中上半部有大片空白 高度大概是 volantis.dom.header.offsetHeight
          volantis.scroll.to(target, { addTop: 5, behavior: 'instant', observer: true })
        }
      }, 1000)
    }
  }
}
Object.freeze(locationHash);

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
      if (document.documentElement.clientWidth < 500) {
        volantis.isMobile = 1;
      } else {
        volantis.isMobile = 0;
      }
      if (volantis.isMobile != volantis.isMobileOld) {
        fn.setGlobalHeaderMenuEvent();
        fn.setHeader();
        fn.setHeaderSearch();
      }
    }
    volantis.scroll.push(fn.scrollEventCallBack, "scrollEventCallBack")
  }

  fn.event = () => {
    volantis.dom.$(document.getElementById("scroll-down"))?.on('click', function () {
      fn.scrolltoElement(volantis.dom.bodyAnchor);
    });

    // 如果 sidebar 为空，隐藏 sidebar。
    const sidebar = document.querySelector("#l_side")
    if (sidebar) {
      const sectionList = sidebar.querySelectorAll("section")
      if (!sectionList.length) {
        document.querySelector("#l_main").classList.add("no_sidebar")
      }
    }

    // 站点信息 最后活动日期
    if (volantis.GLOBAL_CONFIG.sidebar.for_page.includes('webinfo') || volantis.GLOBAL_CONFIG.sidebar.for_post.includes('webinfo')) {
      const lastupd = volantis.GLOBAL_CONFIG.sidebar.webinfo.lastupd;
      if (!!document.getElementById('last-update-show') && lastupd.enable && lastupd.friendlyShow) {
        document.getElementById('last-update-show').innerHTML = fn.utilTimeAgo(volantis.GLOBAL_CONFIG.lastupdate);
      }
    }

    // 站点信息 运行时间
    if (!!document.getElementById('webinfo-runtime-count')) {
      let BirthDay = new Date(volantis.GLOBAL_CONFIG.sidebar.webinfo.runtime.data);
      let timeold = (new Date().getTime() - BirthDay.getTime());
      let daysold = Math.floor(timeold / (24 * 60 * 60 * 1000));
      let count = document.querySelector('#webinfo-runtime-count');
      count.innerHTML = `${(daysold/365).toFixed(2)} ${volantis.GLOBAL_CONFIG.sidebar.webinfo.runtime.unit}`;
      count.title = `${count.title} 👾 ${daysold} 天`;
    }

    // 消息提示 复制时弹出
    document.body.oncopy = function () {
      fn.messageCopyright()
    };

    // NextSite 侧边栏绑定事件
    document.querySelector('.nextsite div.site-nav-toggle')?.addEventListener('click', () => {
      let menu = document.querySelector('.nextsite nav.site-nav');
      if (menu) {
        menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
      }
    })
  }

  fn.restData = () => {
    scrollCorrection = volantis.dom.header ? volantis.dom.header.clientHeight : 80;
  }

  fn.setIsMobile = () => {
    if (document.documentElement.clientWidth < 500) {
      volantis.isMobile = 1;
      volantis.isMobileOld = 1;
    } else {
      volantis.isMobile = 0;
      volantis.isMobileOld = 0;
    }
  }

  // 校正页面定位（被导航栏挡住的区域）
  fn.scrolltoElement = (elem, correction = scrollCorrection) => {
    volantis.scroll.to(elem, {
      top: elem.getBoundingClientRect().top + document.documentElement.scrollTop - correction
    })
  }

  // 滚动事件回调们
  fn.scrollEventCallBack = () => {
    // 【移动端 PC】//////////////////////////////////////////////////////////////////////

    // 显示/隐藏 Header导航 topBtn 【移动端 PC】
    const showHeaderPoint = volantis.dom.bodyAnchor.offsetTop - scrollCorrection;
    const scrollTop = volantis.scroll.getScrollTop(); // 滚动条距离顶部的距离

    // topBtn
    if (volantis.dom.topBtn) {
      if (scrollTop > volantis.dom.bodyAnchor.offsetTop) {
        volantis.dom.topBtn.addClass('show');
        // 向上滚动高亮 topBtn
        if (volantis.scroll.del > 0) {
          volantis.dom.topBtn.removeClass('hl');
        } else {
          volantis.dom.topBtn.addClass('hl');
        }
      } else {
        volantis.dom.topBtn.removeClass('show').removeClass('hl');
      }
    }

    // Header导航
    if (volantis.dom.header) {
      if (scrollTop - showHeaderPoint > -1) {
        volantis.dom.header.addClass('show');
      } else {
        volantis.dom.header.removeClass('show');
      }
    }

    // 决定一二级导航栏的切换 【向上滚动切换为一级导航栏；向下滚动切换为二级导航栏】  【移动端 PC】
    if (pdata.ispage && volantis.dom.wrapper) {
      if (volantis.scroll.del > 0 && scrollTop > 100) { // 向下滚动
        volantis.dom.wrapper.addClass('sub'); // <---- 二级导航显示
      } else if (volantis.scroll.del < 0) { // 向上滚动
        volantis.dom.wrapper.removeClass('sub'); // <---- 取消二级导航显示 一级导航显示
      }
    }

    // 【移动端】//////////////////////////////////////////////////////////////////////
    if (volantis.isMobile) {
      // 【移动端】 页面滚动  隐藏 移动端toc目录按钮
      if (pdata.ispage && volantis.dom.tocTarget && volantis.dom.toc) {
        volantis.dom.tocTarget.removeClass('active');
        volantis.dom.toc.removeClass('active');
      }
      // 【移动端】 滚动时隐藏子菜单
      if (volantis.dom.mPhoneList) {
        volantis.dom.mPhoneList.forEach(function (e) {
          volantis.dom.$(e).hide();
        })
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

    // ====== bind events to every btn =========
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
      if (volantis.dom.comment) volantis.dom.comment.style.display = 'none'; // 关闭了评论，则隐藏评论按钮
    }

    // 移动端toc目录按钮 【移动端】
    if (volantis.isMobile) {
      volantis.dom.toc = volantis.dom.$(document.getElementById("s-toc")); // 目录按钮  仅移动端
      volantis.dom.tocTarget = volantis.dom.$(document.querySelector('#l_side .toc-wrapper')); // 侧边栏的目录列表
      if (volantis.dom.tocTarget && volantis.dom.toc) {
        // 点击移动端目录按钮 激活目录按钮 显示侧边栏的目录列表
        volantis.dom.toc.click((e) => {
          e.stopPropagation();
          volantis.dom.tocTarget.toggleClass('active');
          volantis.dom.toc.toggleClass('active');
        });
        // 点击空白 隐藏
        volantis.dom.$(document).click(function (e) {
          e.stopPropagation();
          if (volantis.dom.tocTarget) {
            volantis.dom.tocTarget.removeClass('active');
          }
          volantis.dom.toc?.removeClass('active');
        });
      } else if (volantis.dom.toc) volantis.dom.toc.style.display = 'none'; // 隐藏toc目录按钮
    }
  }

  // 设置导航栏菜单选中状态  【移动端 PC】
  fn.setHeaderMenuSelection = () => {
    // !!! 此处的Dom对象需要重载 !!!
    volantis.dom.headerMenu = volantis.dom.$(document.querySelectorAll('#l_header .navigation,#l_cover .navigation,#l_side .navigation')); // 导航列表

    // 先把已经激活的取消激活
    volantis.dom.headerMenu.forEach(element => {
      let li = volantis.dom.$(element).find('li a.active')
      if (li)
        li.removeClass('active')
      let div = volantis.dom.$(element).find('div a.active')
      if (div)
        div.removeClass('active')
    });

    // replace '%' '/' '.'
    var idname = location.pathname.replace(/\/|%|\./g, '');
    if (idname.length == 0) {
      idname = 'home';
    }
    var page = idname.match(/page\d{0,}$/g);
    if (page) {
      page = page[0];
      idname = idname.split(page)[0];
    }
    var index = idname.match(/index.html/);
    if (index) {
      index = index[0];
      idname = idname.split(index)[0];
    }
    // 转义字符如 [, ], ~, #, @
    idname = idname.replace(/(\[|\]|~|#|@)/g, '\\$1');
    if (idname && volantis.dom.headerMenu) {
      volantis.dom.headerMenu.forEach(element => {
        // idname 不能为数字开头, 加一个 action- 前缀
        let id = element.querySelector("[active-action=action-" + idname + "]")
        if (id) {
          volantis.dom.$(id).addClass('active')
        }
      });
    }
  }

  // 导航栏激活设定
  fn.nextSiteMenu = () => {
    const element = document.querySelector('.widget.nextsite');
    if (element) {
      let activeItem = element.querySelector('li.menu-item-active');
      if (activeItem) {
        activeItem.removeClass('.menu-item-active');
      }
      let idname = location.pathname.replace(/\/|%|\./g, '');
      if (idname.length == 0) {
        idname = 'home';
      }
      var page = idname.match(/page\d{0,}$/g);
      if (page) {
        page = page[0];
        idname = idname.split(page)[0];
      }
      var index = idname.match(/index.html/);
      if (index) {
        index = index[0];
        idname = idname.split(index)[0];
      }
      // 转义字符如 [, ], ~, #, @
      idname = idname.replace(/(\[|\]|~|#|@)/g, '\\$1');
      let nowItem = element.querySelector("[active-action=action-" + idname + "]");
      if (nowItem?.parentElement) {
        volantis.dom.$(nowItem.parentElement).addClass('menu-item-active')
      }
    }
  }

  // 设置全局事件
  fn.setGlobalHeaderMenuEvent = () => {
    if (volantis.isMobile) {
      // 【移动端】 关闭已经展开的子菜单 点击展开子菜单
      document.querySelectorAll('#l_header .m-phone li').forEach(function (e) {
        if (e.querySelector(".list-v")) {
          // 点击菜单
          volantis.dom.$(e).click(function (e) {
            e.stopPropagation();
            // 关闭已经展开的子菜单
            e.currentTarget.parentElement.childNodes.forEach(function (e) {
              if (Object.prototype.toString.call(e) == '[object HTMLLIElement]') {
                e.childNodes.forEach(function (e) {
                  if (Object.prototype.toString.call(e) == '[object HTMLUListElement]') {
                    volantis.dom.$(e).hide()
                  }
                })
              }
            })
            // 点击展开子菜单
            let array = e.currentTarget.children
            for (let index = 0; index < array.length; index++) {
              const element = array[index];
              if (volantis.dom.$(element).title === 'menu') { // 移动端菜单栏异常
                volantis.dom.$(element).display = "flex"      // https://github.com/volantis-x/hexo-theme-volantis/issues/706
              } else {
                volantis.dom.$(element).show()
              }
            }
          }, 0);
        }
      })
    } else {
      // 【PC端】 hover时展开子菜单，点击时[target.baseURI==origin时]隐藏子菜单? 现有逻辑大部分情况不隐藏子菜单
      document.querySelectorAll('#wrapper .m-pc li > a[href]').forEach(function (e) {
        volantis.dom.$(e.parentElement).click(function (e) {
          e.stopPropagation();
          if (e.target.origin == e.target.baseURI) {
            document.querySelectorAll('#wrapper .m-pc .list-v').forEach(function (e) {
              volantis.dom.$(e).hide(); // 大概率不会执行
            })
          }
        }, 0);
      })
    }
    fn.setPageHeaderMenuEvent();
  }

  // 【移动端】隐藏子菜单
  fn.setPageHeaderMenuEvent = () => {
    if (!volantis.isMobile) return
    // 【移动端】 点击空白处隐藏子菜单
    volantis.dom.$(document).click(function (e) {
      volantis.dom.mPhoneList.forEach(function (e) {
        volantis.dom.$(e).hide();
      })
    });
  }

  // 设置导航栏搜索框 【移动端】
  fn.setHeaderSearch = () => {
    if (!volantis.isMobile) return;
    if (!volantis.dom.switcher) return;
    // 点击移动端搜索按钮
    volantis.dom.switcher.click(function (e) {
      e.stopPropagation();
      volantis.dom.header.toggleClass('z_search-open'); // 激活移动端搜索框
      volantis.dom.switcher.toggleClass('active'); // 移动端搜索按钮
    }, false); // false : pjax 不移除监听
    // 点击空白取消激活
    volantis.dom.$(document).click(function (e) {
      volantis.dom.header.removeClass('z_search-open');
      volantis.dom.switcher.removeClass('active');
    }, false); // false : pjax 不移除监听
    // 移动端点击搜索框 停止事件传播
    volantis.dom.search.click(function (e) {
      e.stopPropagation();
    }, false); // false : pjax 不移除监听
  }

  // 设置 tabs 标签  【移动端 PC】
  fn.setTabs = () => {
    let tabs = document.querySelectorAll('#l_main .tabs .nav-tabs, .widget .tabs .nav-tabs')
    if (!tabs) return
    tabs.forEach(function (e) {
      e.querySelectorAll('a').forEach(function (e) {
        volantis.dom.$(e).on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const $tab = volantis.dom.$(e.target.parentElement.parentElement.parentElement);
          $tab.find('.nav-tabs .active').removeClass('active');
          volantis.dom.$(e.target.parentElement).addClass('active');
          $tab.find('.tab-content .active').removeClass('active');
          $tab.find(e.target.className).addClass('active');
          return false;
        });
      })
    })
  }

  // hexo-reference 页脚跳转 https://github.com/volantis-x/hexo-theme-volantis/issues/647
  fn.footnotes = () => {
    let ref = document.querySelectorAll('#l_main .footnote-backref, #l_main .footnote-ref > a');
    ref.forEach(function (e, i) {
      ref[i].click = () => { }; // 强制清空原 click 事件
      volantis.dom.$(e).on('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        let targetID = decodeURI(e.target.hash.split('#')[1]).replace(/\ /g, '-');
        let target = document.getElementById(targetID);
        if (target) {
          let tempHeight = volantis.dom.header ? volantis.dom.header.offsetHeight : 0;
          volantis.scroll.to(target, { addTop: - tempHeight - 5, behavior: 'instant' })
        }
      });
    })
  }

  // 工具类：代码块复制
  fn.utilCopyCode = (Selector) => {
    document.querySelectorAll(Selector).forEach(node => {
      const test = node.insertAdjacentHTML("beforebegin", COPYHTML);
      const _BtnCopy = node.previousSibling;
      _BtnCopy.onclick = e => {
        e.stopPropagation();
        const _span = _BtnCopy.querySelector('span');

        node.focus();
        const range = new Range();
        range.selectNodeContents(node);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);

        const str = document.getSelection().toString();
        fn.utilWriteClipText(str).then(() => {
          fn.messageCopyright();
          _BtnCopy.classList.add('copied');
          _span.innerText = "COPIED";
          setTimeout(() => {
            _span.innerText = "COPY";
          }, 2000)
        }).catch(e => {
          VolantisApp.message('系统提示', '错误');
          _BtnCopy.classList.add('copied-failed');
          _span.innerText = "COPY FAILED";
          setTimeout(() => {
            _span.innerText = "COPY";
          })
        })
      }
    });
  }

  // 工具类：复制字符串到剪切板
  fn.utilWriteClipText = (str) => {
    return navigator.clipboard
      .writeText(str)
      .then(() => {
        return Promise.resolve()
      })
      .catch(e => {
        const input = document.createElement('textarea');
        input.setAttribute('readonly', 'readonly');
        document.body.appendChild(input);
        input.innerHTML = str;
        input.select();
        try {
          let result = document.execCommand('copy')
          document.body.removeChild(input);
          if (!result || result === 'unsuccessful') {
            return Promise.reject('复制文本失败!')
          } else {
            return Promise.resolve()
          }
        } catch (e) {
          document.body.removeChild(input);
          return Promise.reject(
            '当前浏览器不支持复制功能，请检查更新或更换其他浏览器操作!'
          )
        }
      })
  }

  // 工具类：返回时间间隔
  fn.utilTimeAgo = (date, limit = 30) => {
    try {
      const oldTime = date.getTime()
      const currTime = new Date().getTime()
      const diffValue = currTime - oldTime
      const days = Math.floor(diffValue / (24 * 3600 * 1000))
      if (days === 0) {
        const leave1 = diffValue % (24 * 3600 * 1000)
        const hours = Math.floor(leave1 / (3600 * 1000))
        if (hours === 0) {
          const leave2 = leave1 % (3600 * 1000)
          const minutes = Math.floor(leave2 / (60 * 1000))
          if (minutes === 0) {
            const leave3 = leave2 % (60 * 1000)
            const seconds = Math.round(leave3 / 1000)
            return `${seconds} 秒前`
          }
          return `${minutes} 分钟前`
        }
        return `${hours} 小时前`
      }
      if (days < 0) return '刚刚'

      if (days < limit) {
        return `${days} 天前`
      }

      const Nyear = date.getFullYear();
      const Nmonth = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
      const Ndate = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
      return `${Nyear}年${Nmonth}月${Ndate}日`
    } catch (error) {
      console.error(error)
      return ' - '
    }
  }

  // feather 图标
  fn.feather = () => {
    if(feather) {
      try {
        feather.replace({ 'width': 16, 'height': 16 });
      } catch (error) {
        console.error('图标加载失败', error)
      }
    }
  }

  // 消息提示：标准
  fn.message = (title, message, option = {}, done = null) => {
    if (typeof iziToast === "undefined") {
      volantis.css(volantis.GLOBAL_CONFIG.cdn.izitoast_css)
      volantis.js(volantis.GLOBAL_CONFIG.cdn.izitoast_js, () => {
        tozashMessage(title, message, option, done);
      });
    } else {
      tozashMessage(title, message, option, done);
    }
    function tozashMessage(title, message, option, done) {
      const {
        icon,
        time,
        position,
        transitionIn,
        transitionOut,
        messageColor,
        titleColor,
        backgroundColor,
        zindex,
        displayMode
      } = option;
      iziToast.show({
        layout: '2',
        icon: 'Fontawesome',
        closeOnEscape: 'true',
        displayMode: displayMode || 'replace',
        transitionIn: transitionIn || volantis.GLOBAL_CONFIG.plugins.message.transitionIn,
        transitionOut: transitionOut || volantis.GLOBAL_CONFIG.plugins.message.transitionOut,
        messageColor: messageColor || volantis.GLOBAL_CONFIG.plugins.message.messageColor,
        titleColor: titleColor || volantis.GLOBAL_CONFIG.plugins.message.titleColor,
        backgroundColor: backgroundColor || volantis.GLOBAL_CONFIG.plugins.message.backgroundColor,
        zindex: zindex || volantis.GLOBAL_CONFIG.plugins.message.zindex,
        icon: icon || volantis.GLOBAL_CONFIG.plugins.message.icon.default,
        timeout: time || volantis.GLOBAL_CONFIG.plugins.message.time.default,
        position: position || volantis.GLOBAL_CONFIG.plugins.message.position,
        title: title,
        message: message,
        onClosed: () => {
          if (done) done();
        },
      });
    }
  }

  // 消息提示：询问
  fn.question = (title, message, option = {}, success = null, cancel = null, done = null) => {
    if (typeof iziToast === "undefined") {
      volantis.css(volantis.GLOBAL_CONFIG.cdn.izitoast_css)
      volantis.js(volantis.GLOBAL_CONFIG.cdn.izitoast_js, () => {
        tozashQuestion(title, message, option, success, cancel, done);
      });
    } else {
      tozashQuestion(title, message, option, success, cancel, done);
    }

    function tozashQuestion(title, message, option, success, cancel, done) {
      const {
        icon,
        time,
        position,
        transitionIn,
        transitionOut,
        messageColor,
        titleColor,
        backgroundColor,
        zindex
      } = option;
      iziToast.question({
        id: 'question',
        icon: 'Fontawesome',
        close: false,
        overlay: true,
        displayMode: 'once',
        position: 'center',
        messageColor: messageColor || volantis.GLOBAL_CONFIG.plugins.message.messageColor,
        titleColor: titleColor || volantis.GLOBAL_CONFIG.plugins.message.titleColor,
        backgroundColor: backgroundColor || volantis.GLOBAL_CONFIG.plugins.message.backgroundColor,
        zindex: zindex || volantis.GLOBAL_CONFIG.plugins.message.zindex,
        icon: icon || volantis.GLOBAL_CONFIG.plugins.message.icon.quection,
        timeout: time || volantis.GLOBAL_CONFIG.plugins.message.time.quection,
        title: title,
        message: message,
        buttons: [
          ['<button><b>是</b></button>', (instance, toast) => {
            instance.hide({ transitionOut: transitionOut || 'fadeOut' }, toast, 'button');
            if (success) success(instance, toast)
          }],
          ['<button><b>否</b></button>', (instance, toast) => {
            instance.hide({ transitionOut: transitionOut || 'fadeOut' }, toast, 'button');
            if (cancel) cancel(instance, toast)
          }]
        ],
        onClosed: (instance, toast, closedBy) => {
          if (done) done(instance, toast, closedBy);
        }
      });
    }
  }

  // 消息提示：隐藏
  fn.hideMessage = (done = null) => {
    const toast = document.querySelector('.iziToast');
    if (!toast) {
      if (done) done()
      return;
    }

    if (typeof iziToast === "undefined") {
      volantis.css(volantis.GLOBAL_CONFIG.cdn.izitoast_css)
      volantis.js(volantis.GLOBAL_CONFIG.cdn.izitoast_js, () => {
        hideMessage(done);
      });
    } else {
      hideMessage(done);
    }

    function hideMessage(done) {
      iziToast.hide({}, toast);
      if (done) done();
    }
  }

  // 消息提示：复制
  let messageCopyrightShow = 0;
  fn.messageCopyright = () => {
    // 消息提示 复制时弹出
    if (volantis.GLOBAL_CONFIG.plugins.message.enable
      && volantis.GLOBAL_CONFIG.plugins.message.copyright.enable
      && messageCopyrightShow < 1) {
      messageCopyrightShow++;
      VolantisApp.message(volantis.GLOBAL_CONFIG.plugins.message.copyright.title,
        volantis.GLOBAL_CONFIG.plugins.message.copyright.message, {
        icon: volantis.GLOBAL_CONFIG.plugins.message.copyright.icon,
        transitionIn: 'flipInX',
        transitionOut: 'flipOutX',
        displayMode: 1
      });
    }
  }

  // 转换时间
  fn.dataToShow = () => {
    document.querySelectorAll('.dataToShow').forEach(item => {
      try {
        let time = fn.utilTimeAgo(new Date(item.getAttribute('datetime')), 60).trim();
        item.textContent = time ? time : item.textContent;
      } catch (error) { }
    })
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
      document.querySelector("#l_header .nav-main")?.querySelectorAll('.list-v:not(.menu-phone)')?.forEach(function (e) {
        e.removeAttribute("style")
      })
      document.querySelector("#l_header .menu-phone.list-v")?.removeAttribute("style");
      messageCopyrightShow = 0;
    },
    utilCopyCode: fn.utilCopyCode,
    utilWriteClipText: fn.utilWriteClipText,
    utilTimeAgo: fn.utilTimeAgo,
    message: fn.message,
    question: fn.question,
    hideMessage: fn.hideMessage,
    messageCopyright: fn.messageCopyright,
    scrolltoElement: fn.scrolltoElement
  }
})()
Object.freeze(VolantisApp);

/* FancyBox */
const VolantisFancyBox = (() => {
  const fn = {};

  fn.loadFancyBox = (done) => {
    volantis.css(volantis.GLOBAL_CONFIG.cdn.fancybox_css);
    volantis.js(volantis.GLOBAL_CONFIG.cdn.fancybox_js).then(() => {
      if (done) done();
    })
  }

  /**
   * 加载及处理
   * 
   * @param {*} checkMain 是否只处理文章区域的文章
   * @param {*} done      FancyBox 加载完成后的动作，默认执行分组绑定
   * @returns 
   */
  fn.init = (checkMain = true, done = fn.groupBind) => {
    if (!document.querySelector(".md .gallery img, .fancybox") && checkMain) return;
    if (typeof Fancybox === "undefined") {
      fn.loadFancyBox(done);
    } else {
      done();
    }
  }

  /**
   * 图片元素预处理
   * 
   * @param {*} selectors 选择器
   * @param {*} name      分组
   */
  fn.elementHandling = (selectors, name) => {
    const nodeList = document.querySelectorAll(selectors);
    nodeList.forEach($item => {
      if ($item.hasAttribute('fancybox')) return;
      $item.setAttribute('fancybox', '');
      const $link = document.createElement('a');
      $link.setAttribute('href', $item.src);
      $link.setAttribute('data-caption', $item.alt);
      $link.setAttribute('data-fancybox', name);
      $link.classList.add('fancybox');
      $link.append($item.cloneNode());
      $item.replaceWith($link);
    })
  }

  /**
   * 原生绑定
   * 
   * @param {*} selectors 选择器
   */
  fn.bind = (selectors) => {
    fn.init(false, () => {
      Fancybox.bind(selectors, {
        groupAll: true,
        Hash: false,
        hideScrollbar: false,
        Thumbs: {
          autoStart: false,
        },
        caption: function (fancybox, carousel, slide) {
          return slide.$trigger.alt || null
        }
      });
    });
  }

  /**
   * 分组绑定
   * 
   * @param {*} groupName 分组名称
   */
  fn.groupBind = (groupName = null) => {
    const group = new Set();

    document.querySelectorAll(".gallery").forEach(ele => {
      if (ele.querySelector("img")) {
        group.add(ele.getAttribute('data-group') || 'default');
      }
    })

    if (!!groupName) group.add(groupName);

    for (const iterator of group) {
      Fancybox.unbind('[data-fancybox="' + iterator + '"]');
      Fancybox.bind('[data-fancybox="' + iterator + '"]', {
        Hash: false,
        hideScrollbar: false,
        Thumbs: {
          autoStart: false,
        }
      });
    }
  }

  return {
    init: fn.init,
    bind: fn.bind,
    groupBind: (selectors, groupName = 'default') => {
      try {
        fn.elementHandling(selectors, groupName);
        fn.init(false, () => {
          fn.groupBind(groupName)
        });
      } catch (error) {
        console.error(error)
      }
    }
  }
})()
Object.freeze(VolantisFancyBox);

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
  let fn = {}
  fn.markNum = 0
  fn.markNextId = -1
  fn.startFromURL = () => {
    const params = decodeURI(new URL(location.href).searchParams.get('keyword'));
    const keywords = params ? params.split(' ') : [];
    const post = document.querySelector('#l_main');
    if (keywords.length == 1 && keywords[0] == "null") {
      return;
    }
    fn.start(keywords, post); // 渲染耗时较长
    fn.scrollToFirstHighlightKeywordMark()
  }
  fn.scrollToFirstHighlightKeywordMark = () => {
    volantis.cleanContentVisibility();
    let target = fn.scrollToNextHighlightKeywordMark("0");
    if (!target) {
      volantis.requestAnimationFrame(fn.scrollToFirstHighlightKeywordMark)
    }
  }
  fn.scrollToNextHighlightKeywordMark = (id) => {
    // Next Id
    let input = id || (fn.markNextId + 1) % fn.markNum;
    fn.markNextId = parseInt(input)
    let target = document.getElementById("keyword-mark-" + fn.markNextId);
    if (!target) {
      fn.markNextId = (fn.markNextId + 1) % fn.markNum;
      target = document.getElementById("keyword-mark-" + fn.markNextId);
    }
    if (target) {
      let tempHeight = volantis.dom.header ? volantis.dom.header.offsetHeight : 0;
      volantis.scroll.to(target, { addTop: - tempHeight - 5, behavior: 'instant' })
    }
    // Current target
    return target
  }
  fn.scrollToPrevHighlightKeywordMark = (id) => {
    // Prev Id
    let input = id || (fn.markNextId - 1 + fn.markNum) % fn.markNum;
    fn.markNextId = parseInt(input)
    let target = document.getElementById("keyword-mark-" + fn.markNextId);
    if (!target) {
      fn.markNextId = (fn.markNextId - 1 + fn.markNum) % fn.markNum;
      target = document.getElementById("keyword-mark-" + fn.markNextId);
    }
    if (target) {
      let tempHeight = volantis.dom.header ? volantis.dom.header.offsetHeight : 0;
      volantis.scroll.to(target, { addTop: - tempHeight - 5, behavior: 'instant' })
    }
    // Current target
    return target
  }
  fn.start = (keywords, querySelector) => {
    fn.markNum = 0
    if (!keywords.length || !querySelector || (keywords.length == 1 && keywords[0] == "null")) return;
    console.log(keywords);
    const walk = document.createTreeWalker(querySelector, NodeFilter.SHOW_TEXT, null);
    const allNodes = [];
    while (walk.nextNode()) {
      if (!walk.currentNode.parentNode.matches('button, select, textarea')) allNodes.push(walk.currentNode);
    }
    allNodes.forEach(node => {
      const [indexOfNode] = fn.getIndexByWord(keywords, node.nodeValue);
      if (!indexOfNode.length) return;
      const slice = fn.mergeIntoSlice(0, node.nodeValue.length, indexOfNode);
      fn.highlightText(node, slice, 'keyword');
      fn.highlightStyle()
    });
  }
  fn.getIndexByWord = (words, text, caseSensitive = false) => {
    const index = [];
    const included = new Set();
    words.forEach(word => {
      const div = document.createElement('div');
      div.innerText = word;
      word = div.innerHTML;

      const wordLen = word.length;
      if (wordLen === 0) return;
      let startPosition = 0;
      let position = -1;
      if (!caseSensitive) {
        text = text.toLowerCase();
        word = word.toLowerCase();
      }
      while ((position = text.indexOf(word, startPosition)) > -1) {
        index.push({ position, word });
        included.add(word);
        startPosition = position + wordLen;
      }
    });
    index.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }
      return right.word.length - left.word.length;
    });
    return [index, included];
  };
  fn.mergeIntoSlice = (start, end, index) => {
    let item = index[0];
    let { position, word } = item;
    const hits = [];
    const count = new Set();
    while (position + word.length <= end && index.length !== 0) {
      count.add(word);
      hits.push({
        position,
        length: word.length
      });
      const wordEnd = position + word.length;

      index.shift();
      while (index.length !== 0) {
        item = index[0];
        position = item.position;
        word = item.word;
        if (wordEnd > position) {
          index.shift();
        } else {
          break;
        }
      }
    }
    return {
      hits,
      start,
      end,
      count: count.size
    };
  };
  fn.highlightText = (node, slice, className) => {
    const val = node.nodeValue;
    let index = slice.start;
    const children = [];
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position));
      index = position + length;
      let mark = document.createElement('mark');
      mark.className = className;
      mark = fn.highlightStyle(mark)
      mark.appendChild(document.createTextNode(val.substr(position, length)));
      children.push(text, mark);
    }
    node.nodeValue = val.substring(index, slice.end);
    children.forEach(element => {
      node.parentNode.insertBefore(element, node);
    });
  }
  fn.highlightStyle = (mark) => {
    if (!mark) return;
    mark.id = "keyword-mark-" + fn.markNum;
    fn.markNum++;
    mark.style.background = "#ff0";
    mark.style["border-bottom"] = "1px dashed #ff2a2a";
    mark.style["color"] = "#ff2a2a";
    mark.style["font-weight"] = "bold";
    return mark
  }
  fn.cleanHighlightStyle = () => {
    document.querySelectorAll(".keyword").forEach(mark => {
      mark.style.background = "transparent";
      mark.style["border-bottom"] = null;
      mark.style["color"] = null;
      mark.style["font-weight"] = null;
    })
  }
  return {
    start: (keywords, querySelector) => {
      fn.start(keywords, querySelector)
    },
    startFromURL: () => {
      fn.startFromURL()
    },
    scrollToNextHighlightKeywordMark: (id) => {
      fn.scrollToNextHighlightKeywordMark(id)
    },
    scrollToPrevHighlightKeywordMark: (id) => {
      fn.scrollToPrevHighlightKeywordMark(id)
    },
    cleanHighlightStyle: () => {
      fn.cleanHighlightStyle()
    },
  }
})()
Object.freeze(highlightKeyWords);

/* DOM 控制 */
const DOMController = {
  /**
   * 控制元素显隐
   */
  visible: (ele, type = true) => {
    if (ele) ele.style.display = type === true ? 'block' : 'none';
  },

  /**
   * 移除元素
   */
  remove: (param) => {
    const node = document.querySelectorAll(param);
    node.forEach(ele => {
      ele.remove();
    })
  },

  removeList: (list) => {
    list.forEach(param => {
      DOMController.remove(param)
    })
  },

  /**
   * 设置属性
   */
  setAttribute: (param, attrName, attrValue) => {
    const node = document.querySelectorAll(param);
    node.forEach(ele => {
      ele.setAttribute(attrName, attrValue)
    })
  },

  setAttributeList: (list) => {
    list.forEach(item => {
      DOMController.setAttribute(item[0], item[1], item[2])
    })
  },

  /**
   * 设置样式
   */
  setStyle: (param, styleName, styleValue) => {
    const node = document.querySelectorAll(param);
    node.forEach(ele => {
      ele.style[styleName] = styleValue;
    })
  },

  setStyleList: (list) => {
    list.forEach(item => {
      DOMController.setStyle(item[0], item[1], item[2])
    })
  },

  fadeIn: (e) => {
    if (!e) return;
    e.style.visibility = "visible";
    e.style.opacity = 1;
    e.style.display = "block";
    e.style.transition = "all 0.5s linear";
    return e
  },

  fadeOut: (e) => {
    if (!e) return;
    e.style.visibility = "hidden";
    e.style.opacity = 0;
    e.style.display = "none";
    e.style.transition = "all 0.5s linear";
    return e
  },

  fadeToggle: (e) => {
    if (!e) return;
    if (e.style.visibility == "hidden") {
      e = DOMController.fadeIn(e)
    } else {
      e = DOMController.fadeOut(e)
    }
    return e
  },

  fadeToggleList: (list) => {
    list.forEach(param => {
      DOMController.fadeToggle(param)
    })
  },

  hasClass: (e, c) => {
    if (!e) return;
    return e.className.match(new RegExp('(\\s|^)' + c + '(\\s|$)'));
  },

  addClass: (e, c) => {
    if (!e) return;
    e.classList.add(c);
    return e
  },

  removeClass: (e, c) => {
    if (!e) return;
    e.classList.remove(c);
    return e
  },

  toggleClass: (e, c) => {
    if (!e) return;
    if (DOMController.hasClass(e, c)) {
      DOMController.removeClass(e, c)
    } else {
      DOMController.addClass(e, c)
    }
    return e
  },

  toggleClassList: (list) => {
    list.forEach(item => {
      DOMController.toggleClass(item[0], item[1])
    })
  }
}
Object.freeze(DOMController);

const VolantisRequest = {
  timeoutFetch: (url, ms, requestInit) => {
    const controller = new AbortController()
    requestInit.signal?.addEventListener('abort', () => controller.abort())
    let promise = fetch(url, { ...requestInit, signal: controller.signal })
    if (ms > 0) {
      const timer = setTimeout(() => controller.abort(), ms)
      promise.finally(() => { clearTimeout(timer) })
    }
    promise = promise.catch((err) => {
      throw ((err || {}).name === 'AbortError') ? new Error(`Fetch timeout: ${url}`) : err
    })
    return promise
  },

  Fetch: async (url, requestInit, timeout = 15000) => {
    const resp = await VolantisRequest.timeoutFetch(url, timeout, requestInit);
    if (!resp.ok) throw new Error(`Fetch error: ${url} | ${resp.status}`);
    let json = await resp.json()
    if (!json.success) throw json
    return json
  },

  POST: async (url, data) => {
    const requestInit = {
      method: 'POST',
    }
    if (data) {
      const formData = new FormData();
      Object.keys(data).forEach(key => formData.append(key, String(data[key])))
      requestInit.body = formData;
    }
    const json = await VolantisRequest.Fetch(url, requestInit)
    return json.data;
  }
}
Object.freeze(VolantisRequest);


