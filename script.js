(() => {
    'use strict';

    const CART_KEY = 'blocksmiths-cart-v2';

    const read = () => {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {};
        } catch {
            return {};
        }
    };

    const save = (c) => {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(c));
        } catch {}
        updateCount();
    };

    const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

    const updateCount = () => {
        const c = read();
        const n = Object.values(c).reduce((s, x) => s + x.qty, 0);
        document.querySelectorAll('[data-cart-count]').forEach((e) => (e.textContent = n));
    };

    const getCardData = (card) => {
        const name = card.querySelector('h3')?.textContent.trim() || 'Produk';
        const priceEl = card.querySelector('.product-info .price') || card.querySelector('.product-info p');
        let price = 0;
        if (priceEl) {
            const m = (priceEl.textContent || '').match(/Rp\s*([\d.]+)/);
            price = m ? Number(m[1].replace(/\./g, '')) : 0;
        }
        const img = card.querySelector('img')?.getAttribute('src') || '';
        return { name, price, img };
    };

    document.querySelectorAll('[data-add-cart]').forEach((b) =>
        b.addEventListener('click', () => {
            const card = b.closest('.product-card');
            if (!card) return;
            const p = getCardData(card);
            const c = read();
            if (!c[p.name]) c[p.name] = { ...p, qty: 0 };
            c[p.name].qty++;
            save(c);
            const old = b.textContent;
            b.textContent = '✓ Ditambahkan';
            setTimeout(() => (b.textContent = old), 1000);
        })
    );

    const menu = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.primary-navigation');
    if (menu && nav) {
        menu.addEventListener('click', () => {
            const open = menu.getAttribute('aria-expanded') !== 'true';
            menu.setAttribute('aria-expanded', String(open));
            nav.classList.toggle('is-open', open);
        });
        nav.querySelectorAll('a').forEach((a) =>
            a.addEventListener('click', () => {
                menu.setAttribute('aria-expanded', 'false');
                nav.classList.remove('is-open');
            })
        );
    }

    const filters = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('.product-card[data-category]')];
    const search = document.querySelector('#product-search');
    let chosen = 'all';

    function applyFilter() {
        const term = (search?.value || '').trim().toLowerCase();
        cards.forEach((c) => {
            const category = chosen === 'all' || c.dataset.category === chosen;
            const name = (c.dataset.name || c.querySelector('h3')?.textContent || '').toLowerCase();
            c.hidden = !(category && name.includes(term));
        });
        const empty = document.querySelector('#filter-empty');
        if (empty) empty.hidden = cards.some((c) => !c.hidden);
    }

    filters.forEach((b) =>
        b.addEventListener('click', () => {
            chosen = b.dataset.filter || 'all';
            filters.forEach((x) => {
                x.classList.toggle('is-selected', x === b);
                x.setAttribute('aria-pressed', String(x === b));
            });
            applyFilter();
        })
    );

    search?.addEventListener('input', applyFilter);

    const cartEl = document.querySelector('#cart-items');

    function renderCart() {
        updateCount();
        if (!cartEl) return;
        const c = read();
        const items = Object.entries(c).filter(([_, p]) => p.qty > 0);
        const qty = items.reduce((s, [_, p]) => s + p.qty, 0);
        const sub = items.reduce((s, [_, p]) => s + p.qty * p.price, 0);

        document.querySelectorAll('[data-cart-total-items]').forEach((e) => (e.textContent = qty));
        document.querySelectorAll('[data-cart-subtotal]').forEach((e) => (e.textContent = money(sub)));

        if (!items.length) {
            cartEl.innerHTML =
                '<div class="empty-cart"><p>Troli kamu masih kosong.</p><a class="button" href="catalog.html">Jelajahi katalog →</a></div>';
            return;
        }

        cartEl.innerHTML = items
            .map(
                ([name, p]) => `<article class="cart-item">
                    <div><h3>${esc(name)}</h3><p>${money(p.price)} / produk</p></div>
                    <div class="cart-item-actions">
                        <button class="quantity-button" data-qty="-1" data-name="${esc(name)}" aria-label="Kurangi jumlah">−</button>
                        <span class="cart-qty">${p.qty}</span>
                        <button class="quantity-button" data-qty="1" data-name="${esc(name)}" aria-label="Tambah jumlah">+</button>
                    </div>
                    <div class="cart-item-price"><span>Subtotal</span><span>${money(p.price * p.qty)}</span></div>
                </article>`
            )
            .join('');

        cartEl.querySelectorAll('[data-qty]').forEach((b) =>
            b.addEventListener('click', () => {
                const x = read();
                const n = b.dataset.name;
                if (!x[n]) return;
                x[n].qty += Number(b.dataset.qty);
                if (x[n].qty <= 0) delete x[n];
                save(x);
                renderCart();
            })
        );
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    document.querySelector('[data-clear-cart]')?.addEventListener('click', () => {
        save({});
        renderCart();
        const r = document.querySelector('#order-result');
        if (r) r.hidden = true;
    });

    document.querySelector('#checkout-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const items = Object.values(read()).filter((p) => p.qty > 0);
        const r = document.querySelector('#order-result');
        const name = document.querySelector('#customer-name').value.trim();
        const wa = document.querySelector('#customer-whatsapp').value.trim();
        const note = document.querySelector('#customer-note').value.trim();

        if (!items.length) {
            r.hidden = false;
            r.textContent = 'Troli masih kosong. Tambahkan produk dari katalog terlebih dahulu.';
            return;
        }

        const total = items.reduce((s, p) => s + p.qty * p.price, 0);
        r.hidden = false;
        r.innerHTML = `<strong>Ringkasan order dibuat, ${esc(name)}!</strong>
            <p>WhatsApp: ${esc(wa)}</p>
            <p>${items.map((p) => `${esc(p.name)} × ${p.qty} — ${money(p.price * p.qty)}`).join('<br>')}</p>
            <p><strong>Total simulasi: ${money(total)}</strong></p>
            ${note ? `<p>Catatan: ${esc(note)}</p>` : ''}
            <p>Ini simulasi proyek sekolah, bukan transaksi sungguhan.</p>`;
    });

    document.querySelector('#contact-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const r = document.querySelector('#contact-result');
        r.hidden = false;
        r.textContent =
            'Pesan simulasi berhasil disiapkan. Terima kasih sudah menghubungi Blocksmiths Store.';
        e.target.reset();
    });

    document.querySelectorAll('[data-year]').forEach((e) => (e.textContent = new Date().getFullYear()));

    renderCart();
})();