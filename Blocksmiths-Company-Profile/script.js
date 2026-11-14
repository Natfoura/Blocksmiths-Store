(() => {
    'use strict';

    const CART_KEY = 'blocksmiths-cart-v2';
    const DISCOUNT_KEY = 'blocksmiths-discount';

    let currentDiscount = Number(localStorage.getItem(DISCOUNT_KEY)) || 0;

    const read = () => {
        try {
            const raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

            const clean = {};
            Object.entries(raw).forEach(([key, item]) => {
                if (!item || typeof item !== 'object') return;

                const qty = Math.floor(Number(item.qty) || 0);
                const price = Math.max(0, Number(item.price) || 0);
                if (qty <= 0) return;

                clean[key] = {
                    name: String(item.name || key),
                    price,
                    img: String(item.img || ''),
                    qty
                };
            });
            return clean;
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
        const n = Object.values(c).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

        document.querySelectorAll('[data-cart-count]').forEach((badge) => {
            const previous = Number(badge.textContent.trim()) || 0;
            badge.textContent = String(n);

            if (previous !== n && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                badge.classList.remove('cart-bump');
                void badge.offsetWidth;
                badge.classList.add('cart-bump');
                badge.addEventListener('animationend', () => badge.classList.remove('cart-bump'), { once: true });
            }
        });
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
        
        const discountAmount = sub * (currentDiscount / 100);
        const total = sub - discountAmount;

        document.querySelectorAll('[data-cart-total-items]').forEach((e) => (e.textContent = qty));
        document.querySelectorAll('[data-cart-subtotal]').forEach((e) => (e.textContent = money(sub)));
        document.querySelectorAll('[data-cart-total]').forEach((e) => (e.textContent = money(total)));

        const redeemStatus = document.querySelector('#redeem-status');
        if (redeemStatus) {
            if (currentDiscount > 0) {
                redeemStatus.innerHTML = `✅ Diskon ${currentDiscount}% aktif! (-${money(discountAmount)})`;
                redeemStatus.style.color = '#79e34f';
            } else {
                redeemStatus.innerHTML = '';
            }
        }

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

    // Render the cart on every page load, even when no discount is active.
    renderCart();

    // Keep badges and the order list synchronized if another tab changes localStorage.
    window.addEventListener('storage', (event) => {
        if (event.key === CART_KEY) {
            updateCount();
            renderCart();
        }
        if (event.key === DISCOUNT_KEY) {
            currentDiscount = Number(event.newValue) || 0;
            renderCart();
        }
    });

    const redeemForm = document.querySelector('#redeem-form');
    if (redeemForm) {
        redeemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.querySelector('#redeem-input').value.trim().toUpperCase();
            const status = document.querySelector('#redeem-status');
            
            if (input === 'BLOCKSMITHS10' || input === 'MINECRAFT10') {
                currentDiscount = 10;
                localStorage.setItem(DISCOUNT_KEY, 10);
                status.style.color = '#79e34f';
                status.textContent = '✅ Kode berhasil! Diskon 10% diterapkan.';
                document.querySelector('#redeem-input').value = '';
                renderCart();
            } else {
                status.style.color = '#ff8888';
                status.textContent = '❌ Kode tidak valid. Cari blok rahasia di halaman lain!';
            }
        });
    }

    document.querySelector('[data-clear-cart]')?.addEventListener('click', () => {
        save({});
        currentDiscount = 0;
        localStorage.removeItem(DISCOUNT_KEY);
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

        const sub = items.reduce((s, p) => s + p.qty * p.price, 0);
        const discountAmount = sub * (currentDiscount / 100);
        const total = sub - discountAmount;

        r.hidden = false;
        r.innerHTML = `<strong>Ringkasan order dibuat, ${esc(name)}!</strong>
            <p>WhatsApp: ${esc(wa)}</p>
            <p>${items.map((p) => `${esc(p.name)} × ${p.qty} — ${money(p.price * p.qty)}`).join('<br>')}</p>
            ${currentDiscount > 0 ? `<p style="color: #79e34f;">Diskon (${currentDiscount}%): -${money(discountAmount)}</p>` : ''}
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


    // --- MOTION SYSTEM: SCROLL REVEAL ---
    // Reveal content gently as it enters the viewport.
    const revealTargets = document.querySelectorAll(
        '.section-title, .product-card, .feature-strip, .bottom-banner, ' +
        '.page-heading, .page-hero .container, .about-layout, .value-grid > div, ' +
        '.team-panel, .team-row, .contact-info, .form-panel, .cart-panel, .checkout-panel'
    );

    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion && 'IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.10,
            rootMargin: '0px 0px -35px 0px'
        });

        revealTargets.forEach((element, index) => {
            element.classList.add('reveal-on-scroll');
            element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 75}ms`);
            revealObserver.observe(element);
        });
    }



        // --- LOGIKA EASTER EGG: BREAK THE BLOCK (DENGAN COOLDOWN) ---
    const eggBlock = document.querySelector('#easter-egg-block');
    const eggModal = document.querySelector('#easter-egg-modal');
    const btnCloseEgg = document.querySelector('#btn-close-egg');

    if (eggBlock && eggModal) {
        let clicks = 0;
        const targetClicks = 4; 
        
        // --- PENGATURAN COOLDOWN ---
        const COOLDOWN_TIME = 10 * 1000; // 10 detik (dalam milidetik). Ubah ke 300000 (5 menit) atau 86400000 (24 jam) jika perlu.
        const cooldownKey = 'blocksmiths_egg_cooldown';

        // Cek apakah masih dalam masa cooldown saat halaman dimuat
        const lastBroken = localStorage.getItem(cooldownKey);
        if (lastBroken && Date.now() - Number(lastBroken) < COOLDOWN_TIME) {
            eggBlock.style.display = 'none'; // Sembunyikan blok
        }

        eggBlock.addEventListener('click', () => {
            // Cegah klik jika blok sedang disembunyikan
            if (eggBlock.style.display === 'none') return;

            clicks++;
            
            if (clicks >= targetClicks) {
                eggBlock.classList.add('shattering');
                
                setTimeout(() => {
                    eggBlock.style.display = 'none'; // Sembunyikan total
                    eggModal.classList.remove('hidden-modal');
                    
                    // Set waktu cooldown saat blok dihancurkan
                    localStorage.setItem(cooldownKey, Date.now());
                }, 300);
            } else {
                eggBlock.classList.add('cracked');
                setTimeout(() => eggBlock.classList.remove('cracked'), 200);
            }
        });

        // Logika Tombol Tutup
        if (btnCloseEgg) {
            btnCloseEgg.addEventListener('click', () => {
                eggModal.classList.add('hidden-modal');
            });
        }
    }

    // --- COPY EASTER EGG DISCOUNT CODE ---
    const copyEggButton = document.querySelector('#btn-copy-egg');
    const secretCodeElement = document.querySelector('#secret-code');

    if (copyEggButton && secretCodeElement) {
        copyEggButton.addEventListener('click', async () => {
            const code = secretCodeElement.textContent.trim();

            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(code);
                } else {
                    const temporaryInput = document.createElement('textarea');
                    temporaryInput.value = code;
                    temporaryInput.setAttribute('readonly', '');
                    temporaryInput.style.position = 'fixed';
                    temporaryInput.style.opacity = '0';
                    document.body.appendChild(temporaryInput);
                    temporaryInput.select();

                    const copied = document.execCommand('copy');
                    temporaryInput.remove();

                    if (!copied) throw new Error('Clipboard copy failed');
                }

                copyEggButton.textContent = '✓ Tersalin!';
                copyEggButton.classList.add('copied');
            } catch (error) {
                copyEggButton.textContent = 'Gagal menyalin';
            }

            window.setTimeout(() => {
                copyEggButton.textContent = '📋 Copy';
                copyEggButton.classList.remove('copied');
            }, 1800);
        });
    }



    // Bundle promo carousel: left/right arrows switch between active bundles.
    document.querySelectorAll('[data-bundle-carousel]').forEach((carousel) => {
        const cards = [...carousel.querySelectorAll('.bundle-track > .product-card')];
        const dots = [...carousel.querySelectorAll('.bundle-dots span')];
        if (!cards.length) return;
        let active = 0;
        const show = (index) => {
            active = (index + cards.length) % cards.length;
            cards.forEach((card, i) => {
                card.classList.toggle('is-active', i === active);
                card.setAttribute('aria-hidden', String(i !== active));
            });
            dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
        };
        carousel.querySelector('.bundle-prev')?.addEventListener('click', () => show(active - 1));
        carousel.querySelector('.bundle-next')?.addEventListener('click', () => show(active + 1));
        show(0);
    });
})();