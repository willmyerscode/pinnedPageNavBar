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
    this.scrollTimeout = null;
    this.preventScrollUpdates = false;
    this.activeItem = null;
    
    this.init();
  }

  init() {
    this.setupNavItemData();
    console.log(this.items)
    this.bindEvents();
    this.setActiveSection(this.getMostVisibleSection());
    this.updateVisibilityBasedOnThreshold();
    PinnedPageNavBar.emitEvent('wmPinnedPageNavbar:loaded');
  }

  setupNavItemData() {
    //Build The Items Array with the Button Element & Corresponding Sections
    this.pageNavElements.forEach(element => {
      const button = this.el.querySelector(`button[data-id="${element.dataset.id}"]`);
      let currentSection = element.closest("section");
      const targetSections = [currentSection];
    
      while (currentSection.nextElementSibling) {
        const nextSection = currentSection.nextElementSibling;
        if (nextSection.tagName === "SECTION" && !nextSection.querySelector("[data-wm-pinned-page-navbar], [data-wm-pinned-page-navbar-end]")) {
          targetSections.push(nextSection);
          currentSection = nextSection;
        } else {
          break;
        }
      }
    
      this.items.push({
        buttonEl: button,
        targets: targetSections,
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
    this.addResizeEventListener()
    this.addDOMContentLoadedEventListener()
    this.addLoadEventListener();
    this.addPluginLoadedEventListener();
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
  addResizeEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
    }

    window.addEventListener('resize', handleEvent)
  }
  addDOMContentLoadedEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
    }

    window.addEventListener('DOMContentLoaded', handleEvent)
  }
  addLoadEventListener() {
    const handleEvent = () => {
      this.updateIndicator();
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
      console.log('loaded');
      this.el.style.transitionDelay = '0s'
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
    const firstSection = item.targets[0];
    const top = firstSection.offsetTop;
    window.scrollTo({
      top: top,
      behavior: 'smooth',
    });
  }

  updateVisibilityBasedOnThreshold() {
    const isBelowThreshold = window.scrollY >= this.settings.upperThreshold || this.settings.upperThreshold == 0;
    const isAboveThreshold = (window.scrollY + window.innerHeight) <= (document.body.scrollHeight - this.settings.lowerThreshold + 1)  || this.settings.lowerThreshold == 0;
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
    // The Most Visible Section is either passed in (for button clicks) 
    // or we grab it.
    const mostVisibleSection = section || this.getMostVisibleSection();
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
        this.nav.scrollTo({
          left: scrollTo,
          behavior: 'smooth'
        });
      } 
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
        this.el.dataset.scrollPosition = "above-first"
      } else {
        this.activeItem = this.items[this.items.length - 1];
        this.el.dataset.scrollPosition = "below-last"
      }
    }

    this.updateIndicator();

  }

  updateIndicator(){
    if (this.activeItem) {
      this.setNavWidth()
      const { 
        clientWidth: activeWidth, 
        offsetLeft: activeOffsetLeft,
        clientHeight: activeHeight
      } = this.activeItem.buttonEl;
      this.el.style.setProperty("--indicator-width", activeWidth + "px");
      this.el.style.setProperty("--indicator-left", activeOffsetLeft + "px");
      this.el.style.setProperty("--indicator-height", activeHeight + "px");
    } else {
      this.el.style.setProperty("--indicator-width", "0px");
      this.el.style.setProperty("--indicator-left", "0px");
    }

  };

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
}

(function () {
  // Query all elements with page navigation data attribute
  const pageNavElements = document.querySelectorAll("[data-wm-pinned-page-navbar]");
  if (!pageNavElements.length) return;

  // Function to build page navigation
  function buildNav() {
    const sectionsContainer = document.querySelector("#sections");
    const navElements = Array.from(pageNavElements);
    let navElementIdCounter = 0;

    navElements.forEach(element => {
      element.dataset.id = `page-nav-${++navElementIdCounter}`;
    });

    const navButtonsHtml = navElements
      .map(element => `<button data-id="${element.dataset.id}">${element.innerHTML}</button>`)
      .join("");

    sectionsContainer.insertAdjacentHTML(
      "afterend",
      `<div data-wm-plugin="pinned-page-navbar" class="wm-pinned-page-navbar">
        <nav>
          <span class="indicator-track">
            <span class="indicator"></span>
          </span>
          ${navButtonsHtml}
        </nav>
      </div>`
    );
  }
  buildNav();
  const pageNavPluginElement = document.querySelector('[data-wm-plugin="pinned-page-navbar"]');
  

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
  };
  const mergedSettings = deepMerge({}, defaultSettings, userSettings);

  // Initialize Plugin
  window.wmPinnedPageNavbar = new PinnedPageNavBar(pageNavPluginElement, mergedSettings);
})();
