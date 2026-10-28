const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle && mainNav) {
  const menuIcon = menuToggle.querySelector('i');
  const updateMenuState = (isOpen) => {
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    menuIcon?.classList.toggle('fa-bars', !isOpen);
    menuIcon?.classList.toggle('fa-xmark', isOpen);
  };

  const closeMenu = () => {
    mainNav.classList.remove('open');
    updateMenuState(false);
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    updateMenuState(isOpen);
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

const filterButtons = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((btn) => btn.classList.toggle('is-active', btn === button));

    portfolioItems.forEach((item) => {
      const matches = filter === 'all' || item.dataset.category === filter;
      item.classList.toggle('hidden', !matches);
    });
  });
});

const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const navLinks = document.querySelectorAll('.main-nav a');
navLinks.forEach((link) => {
  const href = link.getAttribute('href');
  if (href && (currentPage === href || (currentPage === '' && href === 'index.html'))) {
    link.classList.add('active');
  }
});

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const existingStatus = contactForm.querySelector('.form-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    if (!submitButton) return;

    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Sending…';
    submitButton.disabled = true;

    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('project-type'),
      message: formData.get('message')
    };

    const statusMessage = document.createElement('p');
    statusMessage.className = 'form-status';
    statusMessage.setAttribute('role', 'status');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const responseBody = await response.text();
      let result = {};

      if (responseBody && response.headers.get('content-type')?.includes('application/json')) {
        try {
          result = JSON.parse(responseBody);
        } catch {
          result = {};
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'We could not send your message right now. Please try again or contact us by WhatsApp.');
      }

      statusMessage.textContent = 'Thanks — your message has been sent to our contact team.';
      statusMessage.classList.add('is-success');
      contactForm.reset();
    } catch (error) {
      statusMessage.textContent = error.message || 'Your message could not be sent. Please try again.';
      statusMessage.classList.add('is-error');
    } finally {
      contactForm.appendChild(statusMessage);
      submitButton.textContent = originalLabel;
      submitButton.disabled = false;
    }
  });
}

const readJsonResponse = async (response, feature) => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error(`${feature} did not receive a response. Start the website with npm start so its API is available.`);
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`${feature} is unavailable. Open the site from the Node.js server, not a static preview.`);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `${feature} could not be completed.`);
  }

  return payload;
};

const renderStars = (rating) => {
  const stars = document.createDocumentFragment();
  Array.from({ length: 5 }, (_, index) => index < Number(rating)).forEach((isFilled) => {
    const star = document.createElement('i');
    star.className = isFilled ? 'fa-solid fa-star' : 'fa-regular fa-star';
    star.setAttribute('aria-hidden', 'true');
    stars.appendChild(star);
  });
  return stars;
};

const renderReviews = (reviews, stats) => {
  const reviewList = document.getElementById('review-list');
  const reviewAverage = document.getElementById('review-average');
  const reviewCount = document.getElementById('review-count');

  if (!reviewList) return;

  if (reviewAverage) {
    reviewAverage.textContent = stats && stats.averageRating ? Number(stats.averageRating).toFixed(1) : '0.0';
  }

  if (reviewCount) {
    const total = stats && stats.total ? stats.total : 0;
    reviewCount.textContent = `${total} public review${total === 1 ? '' : 's'}`;
  }

  reviewList.replaceChildren();

  if (!reviews || !reviews.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'review-empty';

    const heading = document.createElement('h3');
    heading.textContent = 'Be the first to share your experience.';
    const copy = document.createElement('p');
    copy.textContent = 'Your feedback helps future clients understand what it is like to work with Koudak Ouami.';

    emptyState.append(heading, copy);
    reviewList.appendChild(emptyState);
    return;
  }

  reviews.forEach((review) => {
    const card = document.createElement('article');
    card.className = 'review-card';

    const header = document.createElement('div');
    header.className = 'review-header';
    const identity = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = review.name;
    const service = document.createElement('small');
    service.textContent = review.service || 'Client Experience';
    identity.append(name, service);

    const date = document.createElement('time');
    date.className = 'review-date';
    date.dateTime = review.createdAt;
    date.textContent = new Date(review.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    header.append(identity, date);

    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.setAttribute('aria-label', `Rated ${review.rating} out of 5 stars`);
    stars.appendChild(renderStars(review.rating));

    const text = document.createElement('p');
    text.textContent = review.text;
    card.append(header, stars, text);
    reviewList.appendChild(card);
  });
};

const loadReviews = async () => {
  const reviewList = document.getElementById('review-list');
  if (!reviewList) return;

  try {
    const response = await fetch('/api/reviews');
    const payload = await readJsonResponse(response, 'Review service');
    renderReviews(payload.data || [], payload.stats || { total: 0, averageRating: 0 });
  } catch (error) {
    reviewList.replaceChildren();
    const errorState = document.createElement('div');
    errorState.className = 'review-empty review-error';
    const heading = document.createElement('h3');
    heading.textContent = 'Reviews are temporarily unavailable.';
    const copy = document.createElement('p');
    copy.textContent = error.message || 'Please check back soon.';
    errorState.append(heading, copy);
    reviewList.appendChild(errorState);
  }
};

const reviewForm = document.getElementById('review-form');
if (reviewForm) {
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = reviewForm.querySelector('button[type="submit"]');
    const formData = new FormData(reviewForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      service: String(formData.get('service') || '').trim(),
      rating: Number(formData.get('rating') || 5),
      text: String(formData.get('text') || '').trim()
    };

    const existingStatus = reviewForm.querySelector('.form-status');
    if (existingStatus) existingStatus.remove();

    if (!payload.name || !payload.text || payload.text.length < 10) {
      const status = document.createElement('p');
      status.className = 'form-status is-error';
      status.textContent = 'Please add your name and a review of at least 10 characters.';
      reviewForm.appendChild(status);
      return;
    }

    if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      const status = document.createElement('p');
      status.className = 'form-status is-error';
      status.textContent = 'Please choose a rating from 1 to 5 stars.';
      reviewForm.appendChild(status);
      return;
    }

    const originalLabel = submitButton.textContent;
    submitButton.textContent = 'Submitting…';
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await readJsonResponse(response, 'Review submission');

      const status = document.createElement('p');
      status.className = 'form-status is-success';
      status.textContent = result.message;
      reviewForm.appendChild(status);
      reviewForm.reset();
      const defaultFiveStar = reviewForm.querySelector('#review-5');
      if (defaultFiveStar) defaultFiveStar.checked = true;
      await loadReviews();
    } catch (error) {
      const status = document.createElement('p');
      status.className = 'form-status is-error';
      status.textContent = error.message;
      reviewForm.appendChild(status);
    } finally {
      submitButton.textContent = originalLabel;
      submitButton.disabled = false;
    }
  });
}

loadReviews();
