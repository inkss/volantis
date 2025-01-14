class SearchService {
  static instance = null;

  constructor() {
    if (!SearchService.instance) {
      this.queryText = null;
      this.data = null;
      this.hitsEmpty = volantis.GLOBAL_CONFIG.languages.search.hits_empty;
      this.normalText = volantis.GLOBAL_CONFIG.languages.search.normal;
      this.normal = `<div id="resule-hits-empty"><p>${this.normalText}🔍</p></div>`;
      this.template = `
        <div id="u-search">
          <div class="modal">
            <header class="modal-header clearfix">
              <form id="u-search-modal-form" class="u-search-form" name="uSearchModalForm">
                <input type="text" id="u-search-modal-input" class="u-search-input" placeholder="${this.normalText}" />
                <button type="submit" id="u-search-modal-btn-submit" class="u-search-btn-submit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>
              <a id="u-search-btn-close" class="btn-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </a>
            </header>
            <main class="modal-body">
              <ul class="modal-results"></ul>
            </main>
          </div>
          <div id="modal-overlay" class="modal-overlay"></div>
        </div>`;
      this.initInstance();
      SearchService.instance = this;
    }
    return SearchService.instance;
  }

  static init() {
    if (!SearchService.instance) {
      new SearchService();
    }
  }

  initInstance() {
    if (!document.querySelector('#u-search')) {
      const div = document.createElement("div");
      div.innerHTML = this.template;
      document.body.append(div);
    }
    
    this.bindEvents();
  }

  bindEvents() {
    const uSearchModalInput = document.querySelector("#u-search-modal-input");
    if (!uSearchModalInput.hasAttribute('data-event-bound')) {
      let isComposing = false;
      uSearchModalInput.addEventListener("compositionstart", () => (isComposing = true));
      uSearchModalInput.addEventListener("compositionend", (event) => {
        isComposing = false;
        this.onSubmit(event);
      });
      uSearchModalInput.addEventListener("input", (event) => {
        if (!isComposing) this.onSubmit(event);
      });
  
      document.querySelectorAll(".u-search-form").forEach((e) => {
        e.addEventListener("submit", this.onSubmit.bind(this));
      });
      document.querySelector("#u-search-btn-close").addEventListener("click", this.close.bind(this));
      document.querySelector("#modal-overlay").addEventListener("click", this.close.bind(this));
      uSearchModalInput.setAttribute('data-event-bound', 'true');
    }
  }

  async onSubmit(event) {
    event.preventDefault();
    const input = event.target.querySelector(".u-search-input") || event.target;
    this.queryText = input.value.trim();

    await this.search();
  }

  async search() {
    const searchInputs = document.querySelectorAll(".u-search-input");
    const searchModal = document.querySelector("#u-search");
    const modalOverlay = document.querySelector("#modal-overlay");
    const modalResults = document.querySelector("#u-search .modal-results");
    const modal = document.querySelector("#u-search .modal");

    searchInputs.forEach((input) => (input.value = this.queryText));
    searchModal.style.display = "block";
    modalOverlay.style.backdropFilter = "blur(10px)";

    setTimeout(() => {
      modal.style.transform = "translate(0px, 0px)";
    }, 100);

    if (!this.data) {
      this.data = await this.fetchData();
    }

    let results = "";
    results += this.buildResultList(this.data.posts);
    results += this.buildResultList(this.data.pages);

    if (!results) {
      results = `<div id="resule-hits-empty"><i class="fa-solid fa-box-open"></i><p>${this.hitsEmpty.replace(/\$\{query}/, this.queryText)}</p></div>`;
    }

    modalResults.innerHTML = this.queryText === "" ? this.normal : results;
    window.pjax && pjax.refresh(searchModal);

    const handleKeydown = (event) => {
      if (event.code === "Escape") {
        this.close();
        document.removeEventListener("keydown", handleKeydown);
      }
    };

    document.addEventListener("keydown", handleKeydown);
  }

  close() {
    const modal = document.querySelector("#u-search .modal");
    const searchOverlay = document.querySelector("#u-search");
    const modalOverlay = document.querySelector("#modal-overlay");

    modal.style.transform = "translateY(120%)";
    setTimeout(() => {
      searchOverlay.style.display = "none";
      modalOverlay.style.backdropFilter = "blur(0)";
    }, 300);
  }

  async fetchData() {
    try {
      const response = await fetch(volantis.GLOBAL_CONFIG.search.dataPath);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
  }

  buildResultList(data) {
    const sortedData = data.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    return sortedData.reduce((html, post) => {
      if (this.contentSearch(post)) {
        html += this.buildResult(post.permalink, post.title, post.digest);
      }
      return html;
    }, "");
  }

  contentSearch(post) {
    const keywords = this.queryText.toLowerCase().split(/[-\s]+/);
    const postTitle = post?.title?.toLowerCase();
    const postContent = post?.content?.toLowerCase();
    if (!postTitle || !postContent) return false;

    const foundMatch = keywords.some((word) => postTitle.includes(word) || postContent.includes(word));
    if (!foundMatch) return false;

    const firstOccur = keywords.reduce((acc, word) => Math.min(acc, postContent.indexOf(word)), postContent.length);
    const start = Math.max(firstOccur - 40, 0);
    const end = Math.min(firstOccur + 120, postContent.length);
    const matchContent = this.stripHTML(post.content).slice(start, end).replace(new RegExp(`(${keywords.join("|")})`, "gi"), "<b mark>$1</b>");
    post.digest = `${matchContent}......`;

    return true;
  }

  buildResult(url, title, digest) {
    const result = new URL(url).pathname.split("?")[0];
    const digestDom = digest ? `<span class="digest">${digest}</span>` : "";
    return `<li><a class="result" href="${result}?keyword=${this.queryText}"><span class="title">${title}</span>${digestDom}</a></li>`;
  }

  stripHTML(html) {
    // 移除所有换行符并替换成空格
    return html.replace(/\n+/g, ' ')
      .replace(/<(img|figure)[^>]*>.*?<\/\1>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(\S)(https:\/\/)/g, '$1 $2');
  }

  static setQueryText(queryText) {
    SearchService.init();
    SearchService.instance.queryText = queryText;
  }

  static async search() {
    SearchService.init();
    await SearchService.instance.search();
  }
}

new SearchService();
document.addEventListener("pjax:success", new SearchService());
document.addEventListener("pjax:send", () => {
  document.querySelector("#u-search").style.display = "none";
});
