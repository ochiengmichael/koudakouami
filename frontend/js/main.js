const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
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
