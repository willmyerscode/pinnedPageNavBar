/*Issues:
1. There seem to be some performance issues? Maybe throttle the scroll?
*/ 

class pageSubNav {
  constructor(el, settings) {
    this.el = el;
    this.settings = settings;
    this.scrollTimeout = null;
    this.disableObserver = false;
    this.sections = document.querySelectorAll('#sections > .page-section');
    this.onScroll = this.onScroll.bind(this);
    this.init();
  }

  init() {
    this.throttledOnScroll = this.throttle(this.onScroll, 300);
    this.bindEvents();
    this.setActiveSection(this.settings.items[0].targets[0]);
    this.checkIfShouldShow()
  }

  bindEvents() {
    window.addEventListener("scroll", this.throttledOnScroll);
    this.settings.items.forEach(item => {
      item.buttonEl.addEventListener("click", () =>
        this.handleButtonClick(item)
      );
    });
  }

  handleButtonClick(item) {
    this.disableObserver = true;
    this.scrollSectionIntoView(item)
    this.setActiveSection(item.targets[0]);
  }

  onScroll() {
    if (!this.debouncedScrollEnd) {
      this.debouncedScrollEnd = this.createDebouncedScrollEnd(() => {
        this.disableObserver = false;
      }, 300);
    }

    this.debouncedScrollEnd();
  
    if (this.disableObserver) return;
    console.log('run')
    const activeSection = this.getMostVisibleSection();
    this.checkIfShouldShow()
    if (activeSection) {
      this.setActiveSection(activeSection);
    }
  }

  scrollSectionIntoView(item) {
    const firstSection = item.targets[0];
    const top = firstSection.offsetTop;
    window.scrollTo({
      top: top,
      behavior: 'smooth'
    })
  }

  checkIfShouldShow() {
    const isBelowThreshold = window.scrollY >= this.settings.upperThreshold;
    const isAboveThreshold = (window.scrollY + window.innerHeight) <= (document.body.scrollHeight - this.settings.lowerThreshold + 1);
    if (isBelowThreshold && isAboveThreshold) {
      this.el.classList.add('show')
    } else {
      this.el.classList.remove('show')
    }
  }

  setActiveSection(section) {
    const activeItem = this.settings.items.find(
      item => item.targets.includes(section)
    );
  
    if (!activeItem) return;
  
    this.settings.items.forEach(item =>
      item.buttonEl.classList.remove("active")
    );
    activeItem.buttonEl.classList.add("active");
  
    const { clientWidth: activeWidth, offsetLeft: activeOffsetLeft } = activeItem.buttonEl;
    const nav = activeItem.buttonEl.closest("nav");
  
    // Function to update indicator position
    const updateIndicator = () => {
      this.el.style.setProperty("--indicator-width", activeWidth + "px");
      this.el.style.setProperty("--indicator-left", activeOffsetLeft + "px");
    };
    
    /* Center Active Item in Nav */
    const navScrollWidth = nav.scrollWidth;
    const navClientWidth = nav.clientWidth;
  
    if (navScrollWidth > navClientWidth) {
      const activeItemOffset = activeOffsetLeft + activeWidth / 2;
      const navHalfWidth = navClientWidth / 2;
      const scrollTo = activeItemOffset - navHalfWidth;
  
      // Scroll nav to center the active item
      nav.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
      updateIndicator();
    } else {
      updateIndicator();
    }

  }

  getMostVisibleSection() {
    let mostVisibleSection = null;
    let maxVisibleHeight = 0;
    this.sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight;
        mostVisibleSection = section;
      }
    });
    return mostVisibleSection;
  }

  createDebouncedScrollEnd(callback, delay = 100) {
    return () => {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(callback, delay);
    };
  }
  
  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }
  }
}

(function () {
  const pluginEls = document.querySelectorAll("[data-wm-page-nav]");
  let count = 0;

  const buildPageNav = () => {
    const sections = document.querySelector("#sections");
    const initDivs = Array.from(pluginEls);
    initDivs.forEach(div => {
      div.dataset.id = `page-nav-` + (count += 1);
    });

    sections.insertAdjacentHTML(
      "afterend",
      `<div data-wm-plugin="page-nav">
        <nav>
          <span class="indicator"></span>
          ${Array.from(pluginEls)
            .map(
              item =>
                `<button data-id="${item.dataset.id}">${item.innerHTML}</button>`
            )
            .join("")}
        </nav>
      </div>`
    );
  };
  buildPageNav();

  const pluginEl = document.querySelector('[data-wm-plugin="page-nav"]');
  const settings = {
    upperThreshold: 0,
    lowerThreshold: 0
  };
  settings.items = [];

  Array.from(pluginEls).map(el => {
    const button = pluginEl.querySelector(`button[data-id="${el.dataset.id}"]`);
    let currentSection = el.closest("section");
    const targetSections = [currentSection];
  
    while (currentSection.nextElementSibling) {
      const nextSection = currentSection.nextElementSibling;
      if (nextSection.tagName === "SECTION" && !nextSection.querySelector("[data-wm-page-nav]")) {
        targetSections.push(nextSection);
        currentSection = nextSection;
      } else {
        break;
      }
    }
  
    settings.items.push({
      buttonEl: button,
      targets: targetSections,
    });
  });

  new pageSubNav(pluginEl, settings);
})();