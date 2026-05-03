// ===== 全局变量和函数 =====
window.volantis = {};

// 页面DOM操作模块
volantis.dom = {};

// ===== 事件监听器模块 =====
volantis.EventListener = {
  list: [],

  // 移除所有需要清理的事件监听器
  remove() {
    this.list.forEach(listener => {
      listener.ele.removeEventListener(listener.type, listener.f, false);
    });
    this.list = [];
  }
};

// 事件监听器构造函数
class VolantisEventListener {
  constructor(type, handler, element) {
    this.type = type;
    this.f = handler;
    this.ele = element;
  }
}

// ===== DOM 操作封装 =====
class VolantisDom {
  constructor(ele) {
    this._ele = ele || document.createElement('div');
    return new Proxy(this, {
      get(target, prop) {
        if (target[prop] !== undefined) {
          return target[prop];
        }
        if (target._ele[prop] !== undefined) {
          if (typeof target._ele[prop] === 'function') {
            return target._ele[prop].bind(target._ele);
          }
          return target._ele[prop];
        }
        return undefined;
      },
      set(target, prop, value) {
        if (target._ele[prop] !== undefined) {
          target._ele[prop] = value;
          return true;
        }
        target[prop] = value;
        return true;
      }
    });
  }

  // 自定义方法
  find(selector) {
    const found = this._ele.querySelector(selector);
    return found ? new VolantisDom(found) : null;
  }

  hasClass(className) {
    return this._ele.classList.contains(className);
  }

  addClass(classNames) {
    if (typeof classNames !== 'string') return this;
    classNames.split(' ').forEach(className => {
      className && this._ele.classList.add(className);
    });
    return this;
  }

  removeClass(classNames) {
    if (typeof classNames !== 'string') return this;
    classNames.split(' ').forEach(className => {
      className && this._ele.classList.remove(className);
    });
    return this;
  }

  toggleClass(classNames) {
    if (typeof classNames !== 'string') return this;
    classNames.split(' ').forEach(className => {
      className && this._ele.classList.toggle(className);
    });
    return this;
  }

  on(event, handler, removeOnPjax = true) {
    if (typeof handler !== 'function') return this;
    this._ele.addEventListener(event, handler, false);
    if (removeOnPjax) {
      volantis.EventListener.list.push(
        new VolantisEventListener(event, handler, this._ele)
      );
    }
    return this;
  }

  click(handler, removeOnPjax) {
    return this.on('click', handler, removeOnPjax);
  }

  scroll(handler, removeOnPjax) {
    return this.on('scroll', handler, removeOnPjax);
  }

  html(content) {
    if (content === undefined) {
      return this._ele.innerHTML;
    }
    this._ele.innerHTML = content;
    return this;
  }

  hide() {
    this._ele.style.display = 'none';
    return this;
  }

  show() {
    this._ele.style.display = 'block';
    return this;
  }
}

volantis.dom.$ = (ele) => {
  if (!ele) return null;
  if (ele instanceof VolantisDom) {
    return ele;
  }
  if (ele instanceof NodeList || ele instanceof HTMLCollection) {
    return Array.from(ele).map(item => new VolantisDom(item));
  }
  if (ele instanceof Node) {
    return new VolantisDom(ele);
  }
  return null;
};

// ===== 任务执行管理器 =====
class RunItem {
  constructor() {
    this.list = [];
  }

  start() {
    this.list.forEach(item => item.run());
  }

  // name 存在时同名替换，否则追加
  push(fn, name, useRequestAnimationFrame = true) {
    if (typeof fn !== 'function') return;

    let taskFn = fn;
    if (useRequestAnimationFrame) {
      taskFn = () => {
        volantis.requestAnimationFrame(fn);
      };
    }

    if (name) {
      const idx = this.list.findIndex(item => item.name === name);
      if (idx !== -1) {
        this.list[idx] = new TaskItem(taskFn, name);
        return;
      }
    }
    this.list.push(new TaskItem(taskFn, name));
  }

  remove(name) {
    if (typeof name !== 'string') return;
    this.list = this.list.filter(item => item.name !== name);
  }
}

class TaskItem {
  constructor(fn, name) {
    this.name = name || fn.name;
    this.fn = fn;
  }

  run() {
    try {
      this.fn();
    } catch (error) {
      console.error(`Error executing task ${this.name}:`, error);
    }
  }
}

// ===== Pjax =====
// volantis.pjax.send(cb, name)  pjax:send 回调
// volantis.pjax.push(cb, name)  pjax:complete 回调
// volantis.pjax.error(cb, name) pjax:error 回调
volantis.pjax = {};
volantis.pjax.method = {
  complete: new RunItem(),
  error: new RunItem(),
  send: new RunItem()
};
volantis.pjax = Object.assign(volantis.pjax, {
  push: volantis.pjax.method.complete.push.bind(volantis.pjax.method.complete),
  error: volantis.pjax.method.error.push.bind(volantis.pjax.method.error),
  send: volantis.pjax.method.send.push.bind(volantis.pjax.method.send)
});

// ===== 暗色模式 =====
// volantis.dark.mode  当前模式 dark/light
// volantis.dark.toggle()  切换暗色模式
// volantis.dark.push(cb, name)  注册回调
volantis.dark = {};
volantis.dark.method = {
  toggle: new RunItem()
};
volantis.dark = Object.assign(volantis.dark, {
  push: volantis.dark.method.toggle.push.bind(volantis.dark.method.toggle)
});

// ===== 脚本动态加载 =====
// volantis.js(src, cb)  cb: onload 回调或属性对象 {defer:true, onload:()=>{}}
// volantis.css(src)
volantis.js = (src, cb) => {
  const escapeSelector = str => str.replace(/[#".'()[\]]/g, '\\$&');
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${escapeSelector(src)}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;

    const handleLoad = () => {
      if (typeof cb === 'function') cb();
      resolve();
    };

    script.onload = handleLoad;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

    if (cb && typeof cb === 'object' && !Array.isArray(cb)) {
      for (const p in cb) {
        if (!cb.hasOwnProperty(p)) continue;
        if (p === 'onload') {
          script.onload = () => {
            cb[p]();
            resolve();
          };
        } else if (p === 'pjax') {
          script.setAttribute('pjax', '');
          script.setAttribute('data-pjax', '');
        } else if (cb[p] === true) {
          script.setAttribute(p, '');
        } else {
          script.setAttribute(p, cb[p]);
        }
      }
    }

    (document.head || document.documentElement).appendChild(script);
  });
};

volantis.css = (src) => {
  const escapeSelector = str => str.replace(/[#".'()[\]]/g, '\\$&');
  return new Promise((resolve, reject) => {
    const existingLink = document.querySelector(`link[href="${escapeSelector(src)}"]`);
    if (existingLink) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    Object.assign(link, {
      rel: 'stylesheet',
      href: src,
      onload: () => resolve(),
      onerror: () => reject(new Error(`Failed to load CSS: ${src}`))
    });
    document.head.appendChild(link);
  });
};

// ===== requestAnimationFrame =====
volantis.requestAnimationFrame = (fn) => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function (callback) {
      return window.setTimeout(callback, 1000 / 60);
    };
  }
  return window.requestAnimationFrame(fn);
};

// ===== Layout Helper =====
volantis.layoutHelper = (helper, html, opt = {}) => {
  const { clean = false, pjax = true } = { ...opt };
  const handleLayout = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const layoutHelper = document.querySelector(`#layoutHelper-${helper}`);
    if (layoutHelper) {
      if (clean) layoutHelper.innerHTML = '';
      layoutHelper.append(tempDiv);
    }
  };

  handleLayout();
  if (pjax) {
    volantis.pjax.push(handleLayout, `layoutHelper-${helper}`);
  }
};

// ===== 滚动事件处理 =====
volantis.scroll = {
  engine: new RunItem(),
  unengine: new RunItem(),
  isScrolling: false,
  scrollTimer: null,
  push: null,
  ele: null,
  lastScrollTop: 0,
  del: 0,
  getScrollTop: () => (document.compatMode !== 'BackCompat' ? document.documentElement.scrollTop : document.body.scrollTop),
  scrollHeight: () => Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  ),
  offsetHeight: () => Math.max(
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  ),
  progress: function () {
    return this.getScrollTop() / (this.scrollHeight() - this.offsetHeight());
  },
  handleScrollEvents: function () {
    this.lastScrollTop = this.getScrollTop();
    const loop = () => {
      const scrollTop = this.getScrollTop();
      if (this.lastScrollTop !== scrollTop) {
        this.del = scrollTop - this.lastScrollTop;
        this.lastScrollTop = scrollTop;
        this.unengine.list.length = 0;
        this.engine.start();
        this.handleScrollStop();
      } else {
        this.unengine.start();
      }
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  },
  handleScrollStop: function () {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      if (this.lastScrollTop === window.pageYOffset) {
        const lazyLoader = window.lazyLoader;
        if (lazyLoader?.reinitObserver && this.isScrolling) {
          this.isScrolling = false;
          lazyLoader.reinitObserver();
        }
      }
    }, 200);
  },
  debounce: (func, wait = 200) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), wait);
    };
  },
  to: (ele, option = {}) => {
    if (!ele) return;
    volantis.scroll.ele = ele;
    const { top: customTop, addTop = 0, ...restOpt } = option;
    const baseTop = ele.getBoundingClientRect().top + document.documentElement.scrollTop;
    const opt = {
      top: customTop ?? baseTop + addTop,
      behavior: volantis.GLOBAL_CONFIG.scrollSmooth ? 'smooth' : 'instant',
      observerDic: 100,
      ...restOpt
    };
    const currentTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (Math.round(opt.top) !== Math.round(currentTop)) {
      volantis.scroll.isScrolling = true;
      window.scrollTo(opt);
    }
  }
};

volantis.scroll.push = volantis.scroll.engine.push.bind(volantis.scroll.engine);
volantis.scroll.handleScrollEvents();

// ===== 图片错误降级 =====
function errorImgAvatar(img) {
  img.src = volantis.GLOBAL_CONFIG.default.avatar;
  img.onerror = null;
}

function errorImgCover(img) {
  img.src = volantis.GLOBAL_CONFIG.default.cover;
  img.onerror = null;
}

// ===== DOMContentLoaded：缓存 DOM 引用 =====
document.addEventListener('DOMContentLoaded', function () {
  volantis.dom.bodyAnchor = volantis.dom.$(document.getElementById('safearea'));
  volantis.dom.topBtn = volantis.dom.$(document.getElementById('s-top'));
  volantis.dom.wrapper = volantis.dom.$(document.getElementById('wrapper'));
  volantis.dom.switcher = volantis.dom.$(document.querySelector('#l_header .switcher .s-search'));
  volantis.dom.header = volantis.dom.$(document.getElementById('l_header'));
  volantis.dom.search = volantis.dom.$(document.querySelector('#l_header .m_search'));
  volantis.dom.mPhoneList = volantis.dom.$(document.querySelectorAll('#l_header .m-phone .list-v'));
});

// 防止 iframe 嵌套
if (top.location !== self.location) {
  top.location = self.location;
}
