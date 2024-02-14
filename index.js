class pageSubNav {
    constructor(el, settings) {
      this.el = el;
      this.settings = settings;
      this.scrollTimeout = null;
      this.disableObserver = false;
      this.onScroll = this.onScroll.bind(this);
      this.init();
    }
    
    init() {
      this.bindEvents();
      this.setActiveSection(this.settings.items[0].target);
    }
  
    bindEvents() {
      window.addEventListener('scroll', this.onScroll);
      this.settings.items.forEach(item => {
        item.buttonEl.addEventListener('click', () => this.handleButtonClick(item));
      });
    }
  
    handleButtonClick(item) {
      this.disableObserver = true;
      item.target.scrollIntoView({ behavior: 'smooth' });
      this.setActiveSection(item.target);
    }
  
    onScroll() {
      if (!this.debouncedScrollEnd) {
        this.debouncedScrollEnd = this.createDebouncedScrollEnd(() => {
          this.disableObserver = false;
        }, 100);
      }
      
      this.debouncedScrollEnd();
  
      if (this.disableObserver) return;
      const activeSection = this.setMostVisibleSection();
      if (activeSection) {
        this.setActiveSection(activeSection);
      }
    }
  
    setActiveSection(section) {
      const activeItem = this.settings.items.find(item => item.target === section);
      if (!activeItem) return;
  
      this.settings.items.forEach(item => item.buttonEl.classList.remove('active'));
      activeItem.buttonEl.classList.add('active');
  
      const { clientWidth: width, offsetLeft } = activeItem.buttonEl;
      const nav = activeItem.buttonEl.closest('nav');
  
      this.el.style.setProperty('--indicator-width', width + 'px');
      this.el.style.setProperty('--indicator-left', (offsetLeft + nav.scrollLeft) + 'px');
    }
  
    setMostVisibleSection() {
      let mostVisibleSection = null;
      let maxVisibleHeight = 0;
      this.settings.items.forEach(item => {
        const section = item.target
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  
        if (visibleHeight > maxVisibleHeight) {
          maxVisibleHeight = visibleHeight;
          mostVisibleSection = section;
        }
      });
      return mostVisibleSection;  }
  
    createDebouncedScrollEnd(callback, delay = 100) {
      return () => {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(callback, delay);
      };
    }
  }
  
  
  const pluginEls = document.querySelectorAll('[data-wm-page-nav]');
  let count = 0;
  
  const buildPageNav = () => {
    const sections = document.querySelector('#sections');
    const initDivs = Array.from(pluginEls);
    initDivs.forEach(div => {
      div.dataset.id = `page-nav-` + (count += 1)
    })
    
    sections.insertAdjacentHTML('afterend', `<div data-wm-plugin="page-nav">
      <nav>
        <span class="indicator"></span>
        ${Array.from(pluginEls).map(item => (
          `<button data-id="${item.dataset.id}">${item.innerHTML}</button>`
        )).join('')}
      </nav>
    </div>`);
  }
  buildPageNav();
  
  const pluginEl = document.querySelector('[data-wm-plugin="page-nav"]');
  const settings = {};
  settings.items = [];
  
  Array.from(pluginEls).map(el => {
    
    const button = pluginEl.querySelector(`button[data-id="${el.dataset.id}"]`)
    settings.items.push({
      buttonEl: button,
      target: el.closest('section')
    });
    
  });
  
  new pageSubNav(pluginEl, settings);