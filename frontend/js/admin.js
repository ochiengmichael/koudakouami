const loginForm = document.getElementById('admin-login');
const adminStatus = document.getElementById('admin-status');
const reviewsSection = document.getElementById('admin-reviews');
const reviewList = document.getElementById('admin-review-list');
const refreshButton = document.getElementById('admin-refresh');

let adminKey = '';

const setAdminStatus = (message, isError = false) => {
  adminStatus.textContent = message;
  adminStatus.classList.toggle('is-error', isError);
};

const readJsonResponse = async (response) => {
  const responseText = await response.text();
  if (!responseText.trim()) {
    throw new Error('The review API returned an empty response. Confirm the Node.js server is running.');
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error('The review API is unavailable. Open this page from the Node.js server.');
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result;
};

const createReviewCard = (review) => {
  const card = document.createElement('article');
  card.className = 'admin-review-card';

  const header = document.createElement('div');
  header.className = 'admin-review-header';

  const identity = document.createElement('div');
  const name = document.createElement('h3');
  name.textContent = review.name;
  const detail = document.createElement('p');
  detail.textContent = `${review.service || 'Client Experience'} | ${review.rating} of 5 stars`;
  identity.append(name, detail);

  const status = document.createElement('span');
  status.className = `admin-review-status is-${review.status}`;
  status.textContent = review.status;
  header.append(identity, status);

  const text = document.createElement('p');
  text.className = 'admin-review-text';
  text.textContent = review.text;

  const date = document.createElement('time');
  date.dateTime = review.createdAt;
  date.textContent = new Date(review.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  card.append(header, text, date);

  if (review.status === 'pending') {
    const actions = document.createElement('div');
    actions.className = 'admin-review-actions';

    [['approved', 'Approve'], ['rejected', 'Reject']].forEach(([statusValue, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = statusValue === 'approved' ? 'button button-primary' : 'button button-secondary admin-reject';
      button.textContent = label;
      button.addEventListener('click', () => updateReview(review.id, statusValue, button));
      actions.appendChild(button);
    });

    card.appendChild(actions);
  }

  return card;
};

const loadAdminReviews = async () => {
  setAdminStatus('Loading submissions…');
  reviewList.replaceChildren();

  try {
    const response = await fetch('/api/reviews/admin', {
      headers: { 'x-admin-key': adminKey }
    });
    const result = await readJsonResponse(response);

    reviewsSection.hidden = false;
    if (!result.data.length) {
      const emptyState = document.createElement('p');
      emptyState.className = 'admin-empty';
      emptyState.textContent = 'There are no review submissions yet.';
      reviewList.appendChild(emptyState);
    } else {
      result.data.forEach((review) => reviewList.appendChild(createReviewCard(review)));
    }
    setAdminStatus(`${result.data.length} submission${result.data.length === 1 ? '' : 's'} in the review queue.`);
  } catch (error) {
    reviewsSection.hidden = true;
    setAdminStatus(error.message, true);
  }
};

const updateReview = async (reviewId, status, button) => {
  button.disabled = true;
  setAdminStatus(`${status === 'approved' ? 'Approving' : 'Rejecting'} review…`);

  try {
    const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey
      },
      body: JSON.stringify({ status })
    });
    await readJsonResponse(response);

    await loadAdminReviews();
  } catch (error) {
    button.disabled = false;
    setAdminStatus(error.message, true);
  }
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminKey = String(new FormData(loginForm).get('admin-key') || '').trim();
  await loadAdminReviews();
});

refreshButton.addEventListener('click', loadAdminReviews);
