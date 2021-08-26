const base = "https://tiy.adc.ink/";

let cnt = 0;

function tiy(args, str) {
    str = Buffer.from(unescape(encodeURIComponent(str)), "latin1").toString('base64');
    return `<div class="tiy-container"><iframe id="tiy${cnt}" frameborder="no" src="${base}" width="100%" height="100%" onload="(document ? this.contentWindow : this.contentDocument).postMessage('${str}', '*')"></iframe></div>`;
}

hexo.extend.tag.register('tiy', tiy, {
    ends: true,
    async: true
});