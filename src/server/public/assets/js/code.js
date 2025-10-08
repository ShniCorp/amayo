// Mejora de bloques de código: resaltar, barra de acciones (copiar), y etiquetas API/CLI
(function () {
  function enhanceCodeBlocks() {
    const pres = document.querySelectorAll('pre');
    pres.forEach((pre) => {
      if (pre.dataset.enhanced === '1') return;
      pre.dataset.enhanced = '1';

      // Asegurar que exista <code>
      let codeEl = pre.querySelector('code');
      const textRaw = pre.textContent || '';
      if (!codeEl) {
        codeEl = document.createElement('code');
        codeEl.textContent = textRaw;
        const t = textRaw.trimStart();
        const isJSON = t.startsWith('{') || t.startsWith('[');
        const isCLI = /^(!|\$|curl\s|#)/m.test(t);
        if (isJSON) codeEl.className = 'language-json';
        else if (isCLI) codeEl.className = 'language-bash';
        else codeEl.className = 'language-text';
        pre.textContent = '';
        pre.appendChild(codeEl);
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 shadow-lg animate-[slideIn_0.4s_ease-out]';

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between px-3 py-2 text-xs bg-slate-800/60 border-b border-white/10';

      const label = document.createElement('span');
      label.className = 'font-mono tracking-wide text-slate-300';

      const lang = (codeEl.className || '').toLowerCase();
      let kind = '';
      if (/bash|shell|sh/.test(lang)) kind = 'CLI';
      else if (/json|typescript|javascript/.test(lang)) kind = 'API';
      label.textContent = kind || (lang.replace('language-', '').toUpperCase() || 'CODE');
      if (kind === 'API') header.classList.add('is-api');
      else if (kind === 'CLI') header.classList.add('is-cli');

      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-1';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'rounded-md px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 transition';
      copyBtn.textContent = 'Copiar';
      copyBtn.addEventListener('click', async () => {
        try {
          const text = codeEl.innerText || pre.innerText || '';
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = 'Copiado!';
          setTimeout(() => (copyBtn.textContent = 'Copiar'), 1200);
        } catch (err) {
          // silencioso
        }
      });

      header.appendChild(label);
      header.appendChild(actions);
      actions.appendChild(copyBtn);

      const content = document.createElement('div');
      content.className = 'relative';
      if (pre.parentNode) pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(content);
      content.appendChild(pre);

      pre.classList.add('overflow-auto');
    });

    if (window.hljs) {
      document.querySelectorAll('pre code').forEach((el) => {
        window.hljs.highlightElement(el);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceCodeBlocks);
  } else {
    enhanceCodeBlocks();
  }
})();
