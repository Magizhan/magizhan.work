// Like counter backed by Cloudflare Workers KV
const LIKES_API = 'https://likes-api.mags-814.workers.dev';

function getPostId() {
    const btn = document.getElementById('like-btn');
    if (!btn) return null;
    const onclick = btn.getAttribute('onclick');
    const match = onclick && onclick.match(/toggleLike\('(.+?)'\)/);
    return match ? match[1] : null;
}

async function fetchCount(postId) {
    try {
        const res = await fetch(`${LIKES_API}/?post=${postId}`);
        const data = await res.json();
        return data.count || 0;
    } catch {
        return 0;
    }
}

async function incrementCount(postId) {
    try {
        const res = await fetch(`${LIKES_API}/?post=${postId}`, { method: 'POST' });
        const data = await res.json();
        return data.count || 0;
    } catch {
        return null;
    }
}

async function toggleLike(postId) {
    const btn = document.getElementById('like-btn');
    const countEl = document.getElementById('like-count');

    // Disable button during request
    btn.disabled = true;

    const newCount = await incrementCount(postId);

    if (newCount !== null) {
        btn.classList.add('liked');
        btn.style.transform = 'scale(1.15)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);

        countEl.textContent = newCount;
        countEl.style.display = 'inline';
    }

    btn.disabled = false;
}

// Load count on page load
document.addEventListener('DOMContentLoaded', async () => {
    const postId = getPostId();
    if (!postId) return;

    const count = await fetchCount(postId);
    const countEl = document.getElementById('like-count');
    const btn = document.getElementById('like-btn');

    if (count > 0) {
        countEl.textContent = count;
        countEl.style.display = 'inline';
        btn.classList.add('liked');
    }
});
