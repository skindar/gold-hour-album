// Original gallery images & heights
const baseImages = [
  'IMG_001.jpg', 'IMG_002.jpg', 'IMG_003.jpg', 'IMG_004.jpg', 'IMG_005.jpg',
  'IMG_006.jpg', 'IMG_007.jpg', 'IMG_008.jpg', 'IMG_009.jpg', 'IMG_010.jpg',
  'IMG_011.jpg', 'IMG_012.jpg', 'IMG_013.jpg', 'IMG_014.jpg', 'IMG_015.jpg',
  'IMG_016.jpg', 'IMG_017.jpg', 'IMG_018.jpg', 'IMG_019.jpg', 'IMG_020.jpg'
];

const baseHeights = [703, 594, 813, 750, 625, 781, 656, 719, 610, 798, 688, 735, 640, 765, 730, 700, 720, 695, 740, 710];

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create infinite queue avoiding consecutive duplicates
class InfiniteGalleryQueue {
  constructor(images, heights) {
    this.baseImages = images;
    this.baseHeights = heights;
    this.queue = [];
    this.currentIndex = 0;
    this.lastImage = null;
    this.generateMore();
  }

  generateMore() {
    // Generate next shuffled cycle without consecutive duplicates
    const shuffled = shuffle([...this.baseImages]);
    const shuffledHeights = shuffle([...this.baseHeights]);
    
    for (let i = 0; i < shuffled.length; i++) {
      if (shuffled[i] !== this.lastImage) {
        this.queue.push({
          img: shuffled[i],
          height: shuffledHeights[i]
        });
        this.lastImage = shuffled[i];
      }
    }
  }

  getNext() {
    if (this.currentIndex >= this.queue.length) {
      this.generateMore();
    }
    return this.queue[this.currentIndex++];
  }

  getMany(count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(this.getNext());
    }
    return items;
  }
}

const gallery = document.getElementById('galleryGrid');
const baseUrl = '/images/';
const galleryQueue = new InfiniteGalleryQueue(baseImages, baseHeights);

let loadedCount = 0;
const batchSize = 10;

// Render function
function renderItems(count) {
  const items = galleryQueue.getMany(count - loadedCount);
  
  items.forEach(item => {
    const link = document.createElement('a');
    link.href = baseUrl + item.img;
    link.className = 'gallery-item glightbox';
    link.setAttribute('data-gallery', 'gallery');
    link.style.setProperty('--item-height', item.height + 'px');
    
    const imgElement = document.createElement('img');
    imgElement.src = baseUrl + item.img;
    imgElement.alt = 'Photo';
    imgElement.loading = 'lazy';
    
    link.appendChild(imgElement);
    gallery.appendChild(link);
  });
  
  loadedCount = count;
}

// Initial load
renderItems(batchSize * 2);

// Fade-in observer
const fadeObserverOptions = {
  threshold: 0.1,
  rootMargin: '50px'
};

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      fadeObserver.unobserve(entry.target);
    }
  });
}, fadeObserverOptions);

// Infinite scroll observer
const scrollObserverOptions = {
  threshold: 0,
  rootMargin: '500px'
};

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Near bottom - load more
      renderItems(loadedCount + batchSize);
      
      // Re-observe new items for fade
      document.querySelectorAll('.gallery-item').forEach(item => {
        if (!item.classList.contains('in-view')) {
          fadeObserver.observe(item);
        }
      });
      
      // Re-init glightbox
      initGlightbox();
    }
  });
}, scrollObserverOptions);

// Observe all items for fade-in and scroll
function observeAllItems() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    if (!item.classList.contains('in-view')) {
      fadeObserver.observe(item);
    }
  });
  
  // Last item for infinite scroll trigger
  const items = document.querySelectorAll('.gallery-item');
  if (items.length > 0) {
    scrollObserver.observe(items[items.length - 1]);
  }
}

observeAllItems();

// GLightbox
function initGlightbox() {
  if (window.glightbox) {
    window.glightbox.destroy();
  }
  window.glightbox = GLightbox({
    selector: '.glightbox',
    loop: true,
    touchNavigation: true,
    keyboardNavigation: true,
  });
}

initGlightbox();

// Monitor for new items
const mutationObserver = new MutationObserver(() => {
  observeAllItems();
});

mutationObserver.observe(gallery, { childList: true });

console.log('✨ Gallery: infinite scroll + random shuffle (no consecutive duplicates)');
