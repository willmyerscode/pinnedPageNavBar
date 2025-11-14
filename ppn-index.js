/** 
* Pinned Page Navbar for Squarespace
* Copyright Will-Myers.com
**/ 

class PinnedPageNavBar {
  static emitEvent(type, detail = {}, elem = document) {
    // Make sure there's an event type
    if (!type) return;

    // Create a new event
    let event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail,
    });

    // Dispatch the event
    return elem.dispatchEvent(event);
  };
  constructor(el, settings) {
    this.el = el;
    this.settings = settings;
    this.items = [];
    this.nav = this.el.querySelector('nav')
    this.sections = document.querySelectorAll('#sections > .page-section');
    this.pageNavElements = document.querySelectorAll("[data-wm-pinned-page-navbar]");
    this.scrollLeftButton = this.el.querySelector('.scroll-indicator.scroll-left');
    this.scrollRightButton = this.el.querySelector('.scroll-indicator.scroll-right');
    this.indicator = this.el.querySelector('.indicator')
    this.header = document.querySelector('#header')
    this.scrollTimeout = null;
    this.preventScrollUpdates = false;
    this.activeItem = null;
    this.scrollPosition = null;
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    this.init();
  }

  init() {
    this.setupNavItemData();
    this.bindEvents();
    this.setActiveSection(this.getMostVisibleSection());
    this.updateVisibilityBasedOnThreshold()
    setTimeout(() => {
      this.indicator.classList.remove('hidden')
    }, 400)
    this.runScripts();
    PinnedPageNavBar.emitEvent('wmPinnedPageNavbar:loaded');
  }

  setupNavItemData() {
    //Build The Items Array with the Button Element & Corresponding Sections
    this.pageNavElements.forEach(element => {
      const button = this.el.querySelector(`button[data-id="${element.dataset.id}"]`);
      let currentSection = element.closest("section");
      const targetSections = [currentSection];
      const targetSectionIds = [currentSection.dataset.sectionId]
    
      while (currentSection.nextElementSibling) {
        const nextSection = currentSection.nextElementSibling;
        if (nextSection.tagName === "SECTION" && !nextSection.querySelector("[data-wm-pinned-page-navbar], [data-wm-pinned-page-navbar-end]")) {
          targetSections.push(nextSection);
          targetSectionIds.push(nextSection.dataset.sectionId);
          currentSection = nextSection;
        } else {
          break;
        }
      }
    
      this.items.push({
        buttonEl: button,
        targets: targetSections,
        targetIds: targetSectionIds
      });
    });
  }
  
  bindEvents() {    
    this.addScrollEventListener();
    this.handleScrollEnd = this._debounceScrollEnd(() => {
      // Only Run after scroll has ended for 300ms
      this.setActiveSection();
      this.preventScrollUpdates = false;
    }, 300);
    this.addButtonClickEventListeners();
    this.addScrollIndicatorButtonClickEventListeners();
    this.addNavScrollEventListener();
    this.addResizeEventListener()
    this.addDOMContentLoadedEventListener()
    this.addLoadEventListener();
    this.addPluginLoadedEventListener();
    
    this.addAnchorClickListener();
  }

  addButtonClickEventListeners() {
    const handleButtonClick = (item) => {
      this.preventScrollUpdates = true; // Prevent scroll updating
      this.scrollSectionIntoView(item) // Scroll Section into view
      this.setActiveSection(item.targets[0]); // Set specific section as active
    }
    this.items.forEach(item => {
      item.buttonEl.addEventListener("click", () =>
        handleButtonClick(item)
      );
    });
  }
  addScrollIndicatorButtonClickEventListeners() {
    const handleClick = (e) => {
      if (e.target.closest('button.scroll-left')) {
        const left = this.nav.scrollLeft - (this.nav.clientWidth / 2)
        this.nav.scrollTo({
          left: left,
          behavior: 'smooth'
        });
      }
      if (e.target.closest('button.scroll-right')) {
        const left = this.nav.scrollLeft + (this.nav.clientWidth / 2)
        this.nav.scrollTo({
          left: left,
          behavior: 'smooth'
        });
      }
    }

    this.scrollRightButton.addEventListener('click', handleClick);
    this.scrollLeftButton.addEventListener('click', handleClick);
  }
  addNavScrollEventListener() {
    const handleScroll = () => {
      this.updateScrollIndicatorVisibility();
    }
    this.throttledHandleScroll = this._throttle(() => handleScroll(), 300);
    this.nav.addEventListener('scroll', () => this.throttledHandleScroll());
  }
  addResizeEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
      this.updateScrollIndicatorVisibility()
    }

    window.addEventListener('resize', handleEvent)
  }
  addDOMContentLoadedEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
      this.updateScrollIndicatorVisibility();
    }

    window.addEventListener('DOMContentLoaded', handleEvent)
  }
  addLoadEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
      this.updateScrollIndicatorVisibility();
    }

    window.addEventListener('load', handleEvent)
  }
  addScrollEventListener() {
    // Throttle to only run once every 300ms
    this.throttledOnScroll = this._throttle(() => this.onScroll(), 300);
    window.addEventListener('scroll', () => this.throttledOnScroll());
  }
  addPluginLoadedEventListener() {
    const handlePluginLoaded = () => {
      this.el.style.transitionDelay = '0s';
    }

    document.addEventListener('wmPinnedPageNavbar:loaded', handlePluginLoaded)
  }

  onScroll() {
    this.handleScrollEnd();
    if (this.preventScrollUpdates) return;
    this.updateVisibilityBasedOnThreshold();
    this.setActiveSection();
  }

  scrollSectionIntoView(item) {
    let firstSection = item.targets[0];
    const firstSectionId = item.targetIds[0];
    firstSection = document.querySelector(`[data-section-id="${firstSectionId}"]`)
    const firstSectionRect = firstSection.getBoundingClientRect();
    
    // Get the fixed header offset if it exists
    const headerOffset = this.getFixedHeaderOffset();
    
    const top = window.scrollY + firstSectionRect.top - parseInt(this.settings.scrollMargin) - headerOffset;
    window.scrollTo({
      top: top,
      behavior: 'smooth',
    });
  }

  getFixedHeaderOffset() {
    // Check if Squarespace has set a fixed header offset
    const htmlElement = document.documentElement;
    const headerOffsetValue = getComputedStyle(htmlElement).getPropertyValue('--header-fixed-top-offset');
    
    if (headerOffsetValue) {
      return parseFloat(headerOffsetValue);
    }
    
    return 0;
  }

  updateVisibilityBasedOnThreshold() {
    const isBelowThreshold = window.scrollY >= parseInt(this.settings.upperThreshold) || parseInt(this.settings.upperThreshold) === 0;
    const isAboveThreshold = (window.scrollY + window.innerHeight) <= (document.body.scrollHeight - parseInt(this.settings.lowerThreshold) + 1)  || parseInt(this.settings.lowerThreshold) === 0;
    
    if (isBelowThreshold && isAboveThreshold) {
      this.el.classList.add('show')
    } else {
      this.el.classList.remove('show')
    }
  }

  setNavWidth() {
    this.el.style.setProperty("--nav-width", "0px");
    this.el.style.setProperty("--nav-width", this.nav.scrollWidth + "px");
  }

  setActiveSection(section = null) {
    const mostVisibleSection = section || this.getMostVisibleSection();
    const atBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2;

    if (atBottom) {
      const lastItem = this.items[this.items.length - 1];
      if (!lastItem.targets.includes(mostVisibleSection)) {
        this.items.forEach(item => item.buttonEl.classList.remove("active"));
        this.activeItem = lastItem;
        this.scrollPosition = 'below-last'
        this.el.dataset.scrollPosition = "below-last"
        this.updateIndicator();
        return;
      }
    }

    // The Most Visible Section is either passed in (for button clicks) 
    // or we grab it.
    if (!mostVisibleSection) return;
    
    //Check to see if the most visible section is connected to one of our buttons
    this.activeItem = this.items.find(
      item => item.targets.includes(mostVisibleSection)
    );

    this.items.forEach(item =>
      item.buttonEl.classList.remove("active")
    );

    // If most visible section is connected to button,
    // Let's scroll to it into view in the nav and activate that button
    if (this.activeItem) {
      this.activeItem.buttonEl.classList.add("active");
    
      const { clientWidth: activeWidth, offsetLeft: activeOffsetLeft } = this.activeItem.buttonEl;
      
      /* Center Active Item in Nav */
      const navScrollWidth = this.nav.scrollWidth;
      const navClientWidth = this.nav.clientWidth;
    
      if (navScrollWidth > navClientWidth) {
        const activeItemOffset = activeOffsetLeft + activeWidth / 2;
        const navHalfWidth = navClientWidth / 2;
        const scrollTo = activeItemOffset - navHalfWidth;
    
        // Scroll nav to center the active item
        requestAnimationFrame(() => {
          this.nav.scrollTo({ left: scrollTo, behavior: 'smooth' });
        });
      } 
      this.scrollPosition = 'over'
      this.el.dataset.scrollPosition = "over"
    } else {
      // If mostVisibleSection isn't part of a button,
      // Check to see if it is above or below our first and last button
      // And scroll the indicator off the left or right edge
      
      const activeSectionTop = mostVisibleSection.offsetTop;
      const firstSectionTop = this.items[0].targets[0].offsetTop;
      const lastSectionEnd = this.items[this.items.length - 1].targets[this.items[this.items.length - 1].targets.length - 1].offsetTop;
      if (activeSectionTop < firstSectionTop) {
        this.activeItem = this.items[0];
        this.scrollPosition = 'above-first'
        this.el.dataset.scrollPosition = "above-first"
      } else {
        this.activeItem = this.items[this.items.length - 1];
        this.scrollPosition = 'below-last'
        this.el.dataset.scrollPosition = "below-last"
      }
    }

    this.updateIndicator();

  }

  addAnchorClickListener() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(anchor => {
      anchor.addEventListener('click', (event) => {
        this.preventScrollUpdates = true;
        setTimeout(() => {
          this.preventScrollUpdates = false;
          this.onScroll();
        }, 1000);
      });
    });
  }
  
  updateIndicator(){
    if (this.activeItem && this.scrollPosition === 'over') {
      this.setNavWidth()
      const { 
        clientWidth: activeWidth, 
        offsetLeft: activeOffsetLeft,
        clientHeight: activeHeight
      } = this.activeItem.buttonEl;
      this.el.style.setProperty("--indicator-width", activeWidth + "px");
      this.el.style.setProperty("--indicator-left", activeOffsetLeft + "px");
      this.el.style.setProperty("--indicator-height", activeHeight + "px");
    } else if (this.activeItem && this.scrollPosition === 'above-first') {
      this.el.style.setProperty("--indicator-width", this.activeItem.buttonEl.clientWidth + "px");
      this.el.style.setProperty("--indicator-left", "0px");
    } else {
      this.el.style.setProperty("--indicator-width", this.activeItem.buttonEl.clientWidth + "px");
      this.el.style.setProperty("--indicator-left", this.nav.scrollWidth + "px");
    }
    
  };
  updateScrollIndicatorVisibility() {
    let adjustedScrollWidth = this.nav.scrollWidth
    if (this.isSafari) {
      const style = window.getComputedStyle(this.nav);
      const paddingOneSide = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
      adjustedScrollWidth = this.nav.scrollWidth - paddingOneSide
    }
    
    if (this.nav.clientWidth >= adjustedScrollWidth) {
      this.el.dataset.scrollIndicator = 'no-scroll'
      return;
    } 
    
    if (this.nav.scrollLeft <= 3) {
      this.el.dataset.scrollIndicator = 'start' 
    } else if ((this.nav.scrollLeft + this.nav.clientWidth) >= (adjustedScrollWidth - 3)) {
      this.el.dataset.scrollIndicator = 'end'
    } else {
      this.el.dataset.scrollIndicator = 'middle'
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

  _debounceScrollEnd(callback, delay = 300) {
    return () => {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(callback, delay);
    };
  }
  
  _throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return (...args) => {
      const context = this;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  
  runScripts() {
    if (this.settings.pinToTop) this.script_PinToTop();
  }
  script_PinToTop() {
    const navbar = this.el;
    const header = document.querySelector('#header');
    if (!navbar) return;
    function setHeight() {
      const bottom = header ? header.getBoundingClientRect().bottom + 'px' : '0px'
      navbar.style.setProperty('--header-bottom', bottom)
    }
    header.addEventListener('transitionend', setHeight)
  }
}

(function () {
  // Query all elements with page navigation data attribute
  const pageNavElements = document.querySelectorAll("[data-wm-pinned-page-navbar]");
  if (!pageNavElements.length) return;


  // Get page navigation settings
  function deepMerge (...objs) {
  	function getType (obj) {
  		return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  	}
  	function mergeObj (clone, obj) {
  		for (let [key, value] of Object.entries(obj)) {
  			let type = getType(value);
  			if (clone[key] !== undefined && getType(clone[key]) === type && ['array', 'object'].includes(type)) {
  				clone[key] = deepMerge(clone[key], value);
  			} else {
  				clone[key] = structuredClone(value);
  			}
  		}
  	}
  	let clone = structuredClone(objs.shift());
  	for (let obj of objs) {
  		let type = getType(obj);
  		if (getType(clone) !== type) {
  			clone = structuredClone(obj);
  			continue;
  		}
  		if (type === 'array') {
  			clone = [...clone, ...structuredClone(obj)];
  		} else if (type === 'object') {
  			mergeObj(clone, obj);
  		} else {
  			clone = obj;
  		}
  	}
  
  	return clone;
  
  }
  const userSettings = window.wmPinnedPageNavbarSettings ? window.wmPinnedPageNavbarSettings : {};
  const defaultSettings = {
    upperThreshold: 0,
    lowerThreshold: 0,
    scrollMargin: 0,
    insertAdjacent: '#sections',
    insertAdjacentPosition: 'afterend',
    pinToTop: false,
    rightIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
</svg>`,
    leftIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 15.75 3 12m0 0 3.75-3.75M3 12h18" />
</svg>`
  };
  const mergedSettings = deepMerge({}, defaultSettings, userSettings);  

  // Function to build page navigation
  function buildNav() {
    const container = document.querySelector(mergedSettings.insertAdjacent);
    const navElements = Array.from(pageNavElements);
    let navElementIdCounter = 0;

    navElements.forEach(element => {
      element.dataset.id = `page-nav-${++navElementIdCounter}`;
    });

    const navButtonsHtml = navElements
      .map(element => `<button data-id="${element.dataset.id}">${element.innerHTML}</button>`)
      .join("");

    container.insertAdjacentHTML(
      mergedSettings.insertAdjacentPosition,
      `<div data-wm-plugin="pinned-page-navbar" class="wm-pinned-page-navbar${mergedSettings.pinToTop ? ' pin-to-top' : ''}" ${mergedSettings.pinToTop ? `style="--header-bottom: ${document.querySelector('#header').getBoundingClientRect().bottom}px;"` : ''}>
        <button class="scroll-indicator scroll-left">${mergedSettings.leftIcon}</button>
        <div class="nav-container">
          <nav>
            <span class="indicator-track">
              <span class="indicator hidden"></span>
            </span>
            ${navButtonsHtml}
          </nav>
        </div>
        <button class="scroll-indicator scroll-right">${mergedSettings.rightIcon}</button>
      </div>`
    );
  }
  buildNav();
  const pageNavPluginElement = document.querySelector('[data-wm-plugin="pinned-page-navbar"]');

  // Initialize Plugin
  window.wmPinnedPageNavbar = new PinnedPageNavBar(pageNavPluginElement, mergedSettings);
})();
