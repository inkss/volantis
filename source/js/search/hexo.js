let SearchService = (() => {
  const fn = {};
  fn.queryText = null;
  fn.data = null;
  fn.template = `<div id="u-search">
  <div class="modal">
    <header class="modal-header" class="clearfix">
      <form id="u-search-modal-form" class="u-search-form" name="uSearchModalForm">
        <input type="text" id="u-search-modal-input" class="u-search-input" />
        <button type="submit" id="u-search-modal-btn-submit" class="u-search-btn-submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </form>
      <a id="u-search-btn-close" class="btn-close"> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> </a>
    </header>
    <main class="modal-body">
      <ul class="modal-results"></ul>
    </main>
  </div>
  <div id="modal-overlay" class="modal-overlay"></div>
</div>
`;
  fn.init = () => {
    let div = document.createElement("div");
    div.innerHTML += fn.template;
    document.body.append(div);
    document.querySelectorAll(".u-search-form").forEach((e) => {
      e.addEventListener("submit", fn.onSubmit, false);
    });
    let uSearchModalInput = document.querySelector("#u-search-modal-input");
    uSearchModalInput.addEventListener("input", fn.onSubmit);
    document
      .querySelector("#u-search-btn-close")
      .addEventListener("click", fn.close, false);
    document
      .querySelector("#modal-overlay")
      .addEventListener("click", fn.close, false);
  };
  fn.onSubmit = (event) => {
    event.preventDefault();
    let input = event.target.querySelector(".u-search-input");
    if (input) {
      fn.queryText = input.value;
    } else {
      fn.queryText = event.target.value;
    }

    if (fn.queryText) {
      fn.search();
    }
  };
  fn.search = async () => {
    document.querySelectorAll(".u-search-input").forEach((e) => {
      e.value = fn.queryText;
    });
    document.querySelector("#u-search").style.display = "block";
    if (!fn.data) {
      fn.data = await fn.fetchData();
    }
    let results = "";
    results += fn.buildResultList(fn.data?.posts);
    results += fn.buildResultList(fn.data?.pages);
    if (results === "") {
      results = `<div id="resule-hits-empty"><i class="fa-solid fa-box-open"></i><p>${volantis.GLOBAL_CONFIG.languages.search.hits_empty.replace(/\$\{query}/, fn.queryText)}</p></div>`
    }
    document.querySelector("#u-search .modal-results").innerHTML = results;
    window.pjax && pjax.refresh(document.querySelector("#u-search"));
    document.addEventListener("keydown", function f(event) {
      if (event.code === "Escape") {
        fn.close();
        document.removeEventListener("keydown", f);
      }
    });
  };
  fn.close = () => {
    document.querySelector("#u-search").style.display = "none";
  };
  fn.fetchData = () => {
    return fetch(volantis.GLOBAL_CONFIG.search.dataPath)
      .then((response) => response.text())
      .then((res) => {
        const data = JSON.parse(res);
        // console.log(data);
        return data;
      });
  };
  fn.buildResultList = (data) => {
    data.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    let html = "";
    data.forEach((post) => {
      if (fn.contentSearch(post)) {
        html += fn.buildResult(post.permalink, post.title, post.digest);
      }
    });
    return html;
  };
  fn.contentSearch = (post) => {
    let post_title = post?.title?.trim().toLowerCase();
    let post_content = post?.content?.trim().toLowerCase();
    let keywords = fn.queryText
      .trim()
      .toLowerCase()
      .split(/[-\s]+/);
    let foundMatch = false;
    let index_title = -1;
    let index_content = -1;
    let first_occur = -1;
    if (post_title && post_content) {
      keywords.forEach((word, index) => {
        index_title = post_title.indexOf(word);
        index_content = post_content.indexOf(word);
        if (index_title < 0 && index_content < 0) {
          foundMatch = false;
        } else {
          foundMatch = true;
          if (index_content < 0) {
            index_content = 0;
          }
          if (index === 0) {
            first_occur = index_content;
          }
        }
        if (foundMatch) {
          // 临时替换
          post_content = fn.stripHTML(post?.content);
          let start = 0;
          let end = 0;
          if (first_occur >= 0) {
            start = Math.max(first_occur - 40, 0);
            end =
              start === 0
                ? Math.min(200, post_content.length)
                : Math.min(first_occur + 120, post_content.length);
            let match_content = post_content.substring(start, end);
            keywords.forEach(function (keyword) {
              let regS = new RegExp(keyword, "gi");
              match_content = match_content.replace(
                regS,
                "<b mark>" + keyword + "</b>"
              );
            });
            post.digest = match_content + "......";
          } else {
            end = Math.min(200, post_content.length);
            post.digest = post_content.trim().substring(0, end);
          }
        }
      });
    }
    return foundMatch;
  };
  fn.buildResult = (url, title, digest) => {
    let result = fn.getUrlRelativePath(url);
    let digestDom = "", tagsDom = "";
    if (digest !== "") {
      digestDom = `<span class="digest">${digest}</span>`
    }    
    return `<li><a class="result" href ="${result}?keyword=${fn.queryText}"><span class="title">${title}</span>${digestDom}${tagsDom}</a></li>`
  };
  fn.getUrlRelativePath = function (url) {
    let arrUrl = url.split("//");
    let start = arrUrl[1].indexOf("/");
    let relUrl = arrUrl[1].substring(start);
    if (relUrl.indexOf("?") != -1) {
      relUrl = relUrl.split("?")[0];
    }
    return relUrl;
  };
  fn.stripHTML = (html) => {
    // 移除所有换行符
    html = html.replace(/\n+/g, ' ');
    // 移除 img 和 figure 标签及其内容
    html = html.replace(/<(img|figure)[^>]*>.*?<\/\1>/g, '');
    // 移除其他 HTML 标签
    html = html.replace(/<[^>]+>/g, '');
    // 移除所有换行符
    html = html.trim().replace(/\s+/g, ' ')
    // 在 https:// 前面添加空格（如果没有的话） 
    html = html.replace(/(\S)(https:\/\/)/g, '$1 $2');
    // 移除所有换行符
    return html;
  };
  return {
    init: () => {
      fn.init();
    },
    setQueryText: (queryText) => {
      fn.queryText = queryText;
    },
    search: () => {
      fn.search();
    },
  };
})();
Object.freeze(SearchService);

SearchService.init();
document.addEventListener("pjax:success", SearchService.init);
document.addEventListener("pjax:send", function () {
  document.querySelector("#u-search").style.display = "none";
});
