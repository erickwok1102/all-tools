// 報價單 / 發票 / 收據 工具
(function () {
    'use strict';

    const DOCS_KEY = 'yatonDocuments';
    const SETTINGS_KEY = 'yatonDocumentSettings';

    const TYPES = {
        quotation: { title: 'QUOTATION', zh: '報價單', numberLabel: 'Quotation' },
        invoice: { title: 'INVOICE', zh: '發票', numberLabel: 'Invoice' },
        receipt: { title: 'RECEIPT', zh: '收據', numberLabel: 'Receipt' }
    };

    // ---------- 預設資料 ----------
    const SCOPE = 'Scope of Services: All services are clearly defined in this quotation. Any additional items will be quoted separately.';
    const FINAL = 'Final Interpretation: {company} reserves the right of final interpretation in case of any dispute.';
    const NET30 = 'Payment: Payment is due within 30 days of the invoice date (Net 30) by bank transfer, FPS or crossed cheque payable to 「{company}」.';

    const DEFAULT_TERM_SETS = [
        {
            id: 'general',
            name: '一般',
            text: [
                SCOPE,
                'Payment: Payment can be made by bank transfer, FPS or crossed cheque payable to 「{company}」.',
                FINAL
            ].join('\n')
        },
        {
            id: 'performance',
            name: '表演',
            text: [
                SCOPE,
                'Confirmation & Deposit: A non-refundable deposit of 20% of the total amount is required upon signing to confirm the booking. The balance is due on or before the performance date.',
                'Cancellation: Once this quotation is signed and the deposit is received, the booking cannot be cancelled or refunded.',
                'Adverse Weather: If Typhoon Signal No. 8 or above or a Black Rainstorm Warning is in force at the performance time, the performance will be rescheduled to a date agreed by both parties.',
                'Payment: Payment can be made by bank transfer, FPS, cash or crossed cheque payable to 「{company}」. Other payment methods may be accepted by mutual agreement.',
                FINAL
            ].join('\n')
        },
        {
            id: 'class',
            name: '課程',
            text: [
                SCOPE,
                'No Early Termination: Once this quotation is signed, the client cannot terminate the contract or request a refund before the agreed completion date.',
                'Student Number & Class Cancellation: The coaching fee for each scheduled lesson must be paid in full, even if fewer students attend than expected or the client cancels the lesson.',
                'Postponement: A lesson may be postponed once only, with prior written agreement from the coach.',
                'Adverse Weather & School Suspension: If Typhoon Signal No. 8 or above, a Black Rainstorm Warning or a school suspension is in force, the lesson fee will not be reduced. The lesson may be rescheduled to another date agreed with the coach.',
                'Performances & Competitions: Coach attendance at a performance or competition is charged as one lesson (one hour) unless stated otherwise.',
                'Equipment Rental: Rented equipment must be properly kept by the client. The client is fully responsible for repair or replacement if it is lost or damaged outside lesson time.',
                NET30,
                FINAL
            ].join('\n')
        },
        {
            id: 'equipment',
            name: '裝備及制服',
            text: [
                SCOPE,
                'Production: Production starts after this quotation is confirmed. Lead time is at least 2 weeks for lion equipment and 60 working days for dragons, unless stated otherwise.',
                'Delivery: Prices include delivery and installation at the client\'s premises unless stated otherwise.',
                'Custom-made items cannot be cancelled or refunded once production has started.',
                NET30,
                FINAL
            ].join('\n')
        },
        {
            id: 'invoice',
            name: '發票付款',
            text: [
                'Payment is due within 30 days of the invoice date (Net 30).',
                'Payment can be made by bank transfer, FPS or crossed cheque payable to 「{company}」.',
                'Please quote the invoice number when making payment.'
            ].join('\n')
        }
    ];

    const DEFAULT_PROFILES = [
        {
            id: 'yaton',
            label: '溢安體育會',
            companyName: 'Yat On Sport Association Limited',
            phone: '62001654 (Mr.Kwok)',
            social: 'yatonsa',
            address: '',
            paymentNote: '支票請開以下的帳戶',
            bankInfo: '',
            signerName: 'Eric Kwok',
            signerTitle: 'Founder',
            signature: '',
            chop: '',
            prefixes: { quotation: 'Q', invoice: 'Inv', receipt: 'Rec' },
            defaultTerms: { quotation: 'general', invoice: 'invoice', receipt: '' }
        },
        {
            id: 'consult',
            label: 'Eric Kwok (顧問)',
            companyName: 'Eric Kwok',
            phone: '',
            social: '',
            address: '',
            paymentNote: '',
            bankInfo: '',
            signerName: 'Eric Kwok',
            signerTitle: 'Founder',
            signature: '',
            chop: '',
            prefixes: { quotation: 'Q', invoice: 'INV', receipt: 'REC' },
            defaultTerms: { quotation: '', invoice: '', receipt: '' }
        }
    ];

    // 由舊單整理出嚟最常用嘅項目
    const LDP_DETAILS = 'Date: \nTime: \nLocation: \nLion: 2';
    const MALL_DETAILS = 'Date: \nTime: \n兩頭醒獅 醒獅矮樁表演\n表演包括：點睛、採青及梅花樁表演；獅子巡遊 (一頭獅及一個鼓為一隊)\n#表演時間約10分鐘，表演連巡遊約為2小時 (包括：點睛、採青、禮炮、放聯、保險、旺場)';
    const COURSE_DETAILS = '日期：\n時間：\n課堂時間：每堂1小時\n學員人數：\n課堂數量：\n地點：\n*表演日如需教練出席，將按1堂 (1小時) 計算';
    const DEFAULT_PRESETS = [
        { id: 'p-cny', profileId: 'yaton', category: 'performance', label: '新年醒獅 (酒店/屋苑)', title: 'Lion Dance Performance', details: 'Date:  (CNY-)\nTime: \nLocation: \nLion: 2', price: 9800, qty: 1, unit: '' },
        { id: 'p-school-show', profileId: 'yaton', category: 'performance', label: '學校醒獅 (點睛採青)', title: 'Lion Dance Performance', details: LDP_DETAILS + '\n點睛、採青、吉祥吐紅及大合照\n*已包括點睛及採青用品\n*本團將於活動開始前最少30分鐘到達場地', price: 6800, qty: 1, unit: '' },
        { id: 'p-mall', profileId: 'yaton', category: 'performance', label: '商場矮樁 + 巡遊', title: 'Lion Dance Performance', details: MALL_DETAILS, price: 13800, qty: 1, unit: '' },
        { id: 'p-mall-plum', profileId: 'yaton', category: 'performance', label: '商場梅花樁 + 兩隊巡遊', title: 'Lion Dance Performance', details: 'Date: \nTime: \nLocation: \n兩頭醒獅 梅花樁表演\n表演包括：點睛、採青及梅花樁表演；兩隊獅子巡遊 (一頭獅及一個鼓為一隊)\n#表演時間約10分鐘，表演連巡遊約為3小時 (包括：點睛、採青、禮炮、放聯、保險、旺場)', price: 17000, qty: 1, unit: '' },
        { id: 'p-course-lion', profileId: 'yaton', category: 'class', label: '獅藝班 (全年)', title: '獅藝班課程', details: COURSE_DETAILS, price: 1000, qty: 20, unit: '小時' },
        { id: 'p-course-dragon', profileId: 'yaton', category: 'class', label: '龍藝班 (全年)', title: '龍藝班課程', details: COURSE_DETAILS, price: 1000, qty: 20, unit: '小時' },
        { id: 'p-short', profileId: 'yaton', category: 'class', label: '短期課程', title: '獅藝短期課程', details: '日期：\n表演日：\n時間：\n課堂時間：每堂60分鐘\n學員人數：\n課堂數量： (已計算表演日)\n地點：\n支付方式：現金、銀行轉帳或支票\n支付日期：Net 30', price: 1000, qty: 5, unit: '堂' },
        { id: 'p-ngo', profileId: 'yaton', category: 'class', label: 'NGO 兒童班', title: '兒童舞獅課程', details: '日期：\n時間：\n課堂：\n課堂時間：每堂1小時\n學員人數：每班8-15人\n地點：', price: 500, qty: 6, unit: '堂' },
        { id: 'p-coach-show', profileId: 'yaton', category: 'class', label: '表演日教練到場', title: '表演日教練到場', details: '表演日：', price: 500, qty: 1, unit: '小時' },
        { id: 'p-rent-dragon', profileId: 'yaton', category: 'class', label: '租借練習龍', title: '裝備租借 - 練習龍1條', details: '租借時間：', price: 2800, qty: 1, unit: '' },
        { id: 'p-rent-lion', profileId: 'yaton', category: 'class', label: '租借練習獅套裝', title: '裝備租借', details: '練習獅子1隻、鼓連鼓棍、鼓架、鈸3對\n租借時間：', price: 3000, qty: 1, unit: '' },
        { id: 'p-transport', profileId: 'yaton', category: 'class', label: '道具運輸費', title: '道具運輸費', details: '', price: 800, qty: 1, unit: '' },
        { id: 'p-dragon11', profileId: 'yaton', category: 'equipment', label: '11吋9節比賽龍', title: 'Equipment: Dragon (11" in)', details: '夜光布及色料、龍桿與桿 1.9m、全長約16m、9節龍連龍珠、合香港比賽規格款式、連運費到學校、包安裝', price: 10800, qty: 1, unit: '條' },
        { id: 'p-lion-kit', profileId: 'yaton', category: 'equipment', label: '小學醒獅練習裝備', title: '醒獅練習裝備', details: '小學用醒獅 x 1 隻\n鼓 (連鼓架) x 1 個\n鼓棍 x 2 對\n鈸 x 4 對\n鑼 x 1 個\n連運費及安裝費用，裝備製作需最少2星期', price: 8800, qty: 1, unit: '' },
        { id: 'p-show-lion', profileId: 'yaton', category: 'equipment', label: '表演獅子一套', title: '表演獅子一套', details: '', price: 5400, qty: 1, unit: '' },
        { id: 'p-uniform', profileId: 'yaton', category: 'equipment', label: '制服 (連設計)', title: 'Uniform Set (with Design)', details: 'Size:\n', price: 160, qty: 20, unit: 'Set' },
        { id: 'c-biz', profileId: 'consult', category: 'consult', label: 'Business consultant fee', title: 'Business consultant fee - ()', details: '', price: 8000, qty: 1, unit: '' },
        { id: 'c-meta-mgmt', profileId: 'consult', category: 'consult', label: 'Meta Ads 管理費', title: 'Meta Ads Management & Handling Fee', details: '$6,000 Ad Fee', price: 600, qty: 1, unit: '' },
        { id: 'c-marketing', profileId: 'consult', category: 'consult', label: 'Marketing Consultation', title: 'Marketing Consultation ()', details: '4 Blog Post / Month\n4 Social Post / Month', price: 10000, qty: 1, unit: '' },
        { id: 'c-meta-fee', profileId: 'consult', category: 'consult', label: 'Meta Ad Fee', title: 'Meta Ad Fee ()', details: '', price: 2500, qty: 1, unit: '' },
        { id: 'c-tutor', profileId: 'consult', category: 'consult', label: '導師費用', title: '導師費用', details: 'Date: \nTime: ', price: 6000, qty: 1, unit: '日' },
        { id: 'c-assist', profileId: 'consult', category: 'consult', label: '助教費用', title: '助教費用', details: 'Date: \nTime: ', price: 1500, qty: 1, unit: '' }
    ];

    const CATEGORY_NAMES = { performance: '表演', class: '課程', equipment: '裝備', consult: '顧問', custom: '自訂' };
    // 加入快捷項目時，報價單條款跟住呢個優先次序揀
    const CATEGORY_TERMS = ['class', 'performance', 'equipment'];

    // ---------- 儲存 ----------
    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            alert('儲存失敗：瀏覽器儲存空間不足或被封鎖。請先匯出備份。');
            return false;
        }
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeSettings(saved) {
        saved = saved || {};
        const profiles = clone(DEFAULT_PROFILES);
        // 第一版設定冇 profiles，直接當係溢安
        if (!saved.profiles && saved.companyName) {
            Object.assign(profiles[0], {
                companyName: saved.companyName, phone: saved.phone, social: saved.social, address: saved.address,
                paymentNote: saved.paymentNote, bankInfo: saved.bankInfo, signerName: saved.signerName,
                signerTitle: saved.signerTitle, signature: saved.signature || ''
            });
        }
        (saved.profiles || []).forEach(p => {
            const base = profiles.find(x => x.id === p.id);
            if (base) {
                Object.assign(base, p, {
                    prefixes: Object.assign({}, base.prefixes, p.prefixes),
                    defaultTerms: Object.assign({}, base.defaultTerms, p.defaultTerms)
                });
            } else {
                profiles.push(p);
            }
        });
        const termSets = clone(DEFAULT_TERM_SETS);
        (saved.termSets || []).forEach(t => {
            const base = termSets.find(x => x.id === t.id);
            if (base) Object.assign(base, t); else termSets.push(t);
        });
        return {
            profiles,
            termSets,
            presets: saved.presets ? saved.presets : clone(DEFAULT_PRESETS)
        };
    }

    let settings = normalizeSettings(readJSON(SETTINGS_KEY, null));
    let docs = readJSON(DOCS_KEY, []);
    let current = null;
    let dirty = false;
    let settingsProfileId = 'yaton';

    // ---------- 工具函數 ----------
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function money(n) {
        const value = Number(n) || 0;
        return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function todayISO() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function displayDate(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return d + '/' + m + '/' + y;
    }

    function newId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function profileOf(doc) {
        return settings.profiles.find(p => p.id === (doc && doc.profileId)) || settings.profiles[0];
    }

    function itemAmount(item) {
        return (Number(item.price) || 0) * (Number(item.qty) || 0);
    }

    function docTotal(doc) {
        return doc.items.reduce((sum, item) => sum + itemAmount(item), 0);
    }

    function termSetText(id, profile) {
        const set = settings.termSets.find(t => t.id === id);
        return set ? set.text.replace(/\{company\}/g, profile.companyName || '') : '';
    }

    // 而家條款係咪某個範本 (未改過)
    function matchingTermSet(doc) {
        const profile = profileOf(doc);
        const text = (doc.terms || '').trim();
        if (!text) return '';
        const set = settings.termSets.find(t => termSetText(t.id, profile).trim() === text);
        return set ? set.id : null;
    }

    // 編號格式跟舊範本：開頭 + YYYYMMDD + 兩位流水號
    function nextNumber(doc, excludeId) {
        const prefix = profileOf(doc).prefixes[doc.type] || '';
        const base = prefix + (doc.date || todayISO()).replace(/-/g, '');
        const baseLower = base.toLowerCase();
        let max = 0;
        docs.forEach(d => {
            if (d.id === excludeId || !d.number || !d.number.toLowerCase().startsWith(baseLower)) return;
            const seq = parseInt(d.number.slice(base.length), 10);
            if (seq > max) max = seq;
        });
        return base + String(max + 1).padStart(2, '0');
    }

    function blankItem() {
        return { title: '', details: '', price: '', qty: 1, unit: '', priceText: '' };
    }

    function isBlankItem(item) {
        return !item.title && !item.details && !item.price && !item.priceText;
    }

    function typeDefaults(type, profileId) {
        const profile = settings.profiles.find(p => p.id === profileId) || settings.profiles[0];
        return {
            terms: termSetText(profile.defaultTerms[type], profile),
            showBank: type !== 'receipt',
            showClientSign: type === 'quotation',
            showSignature: type !== 'quotation',
            showChop: type === 'receipt',
            paid: false
        };
    }

    function newDoc(type, profileId) {
        profileId = profileId || settings.profiles[0].id;
        const doc = Object.assign({
            id: newId(),
            type,
            profileId,
            number: '',
            numberEdited: false,
            date: todayISO(),
            toName: '',
            contact: '',
            mobile: '',
            remarks: '',
            note: '',
            items: [blankItem()],
            createdAt: null,
            updatedAt: null
        }, typeDefaults(type, profileId));
        doc.number = nextNumber(doc);
        return doc;
    }

    function isSaved(doc) {
        return docs.some(d => d.id === doc.id);
    }

    // ---------- 預覽 ----------
    function renderPreview() {
        const doc = current;
        const type = TYPES[doc.type];
        const profile = profileOf(doc);
        const social = profile.social ? '@' + profile.social.replace(/^@/, '') : '';
        const brandLines = [profile.phone, social, profile.address].filter(Boolean).map(esc).join('&ensp;·&ensp;');

        const rows = doc.items.map((item, i) => {
            const qty = Number(item.qty) || 0;
            const hasContent = item.title || item.price || item.priceText;
            const showQty = hasContent && !item.priceText && (qty !== 1 || item.unit);
            const amount = item.priceText ? esc(item.priceText) : (hasContent ? money(itemAmount(item)) : '');
            return '<tr>' +
                '<td class="c-no">' + String(i + 1).padStart(2, '0') + '</td>' +
                '<td class="c-desc"><div class="doc-item-title">' + esc(item.title) + '</div>' +
                    (item.details ? '<div class="doc-item-details">' + esc(item.details) + '</div>' : '') + '</td>' +
                '<td class="c-qty">' + (showQty ? esc(qty) + (item.unit ? ' ' + esc(item.unit) : '') : '') + '</td>' +
                '<td class="c-unit">' + (showQty ? money(item.price) : '') + '</td>' +
                '<td class="c-amt">' + amount + '</td>' +
            '</tr>';
        }).join('');

        const terms = (doc.terms || '').split('\n').map(t => t.trim()).filter(Boolean);
        const showBank = doc.showBank && (profile.paymentNote || profile.bankInfo);
        const signature = doc.showSignature && profile.signature
            ? '<img class="doc-sign-sig" src="' + esc(profile.signature) + '" alt="">' : '';
        const chop = doc.showChop && profile.chop
            ? '<img class="doc-sign-chop" src="' + esc(profile.chop) + '" alt="">' : '';
        const clientSign = doc.showClientSign
            ? '<div class="doc-sign doc-client-sign">' +
                '<div class="doc-sign-space"></div>' +
                '<div class="doc-sign-rule"></div>' +
                '<div class="doc-sign-name">Client Signature &amp; Company Chop</div>' +
                '<div class="doc-sign-role">Name / Title / Date</div>' +
              '</div>'
            : '';
        const contactLabel = /@/.test(doc.mobile) ? 'Email' : 'Tel';

        $('#docPage').innerHTML = '<div class="doc-inner">' +
            '<header class="doc-head">' +
                '<div><div class="doc-brand-name">' + esc(profile.companyName) + '</div>' +
                    (brandLines ? '<div class="doc-brand-lines">' + brandLines + '</div>' : '') + '</div>' +
                '<div class="doc-type">' + type.title + '</div>' +
            '</header>' +
            '<section class="doc-meta">' +
                '<div><span class="doc-label">' + (doc.type === 'quotation' ? 'Prepared for' : 'Billed to') + '</span>' +
                    '<div class="doc-meta-value doc-client-name">' + esc(doc.toName) + '</div>' +
                    (doc.contact ? '<div class="doc-meta-value">Attn: ' + esc(doc.contact) + '</div>' : '') +
                    (doc.mobile ? '<div class="doc-meta-value">' + contactLabel + ': ' + esc(doc.mobile) + '</div>' : '') +
                '</div>' +
                '<div><div class="doc-meta-block"><span class="doc-label">' + type.numberLabel + ' No.</span><div class="doc-meta-value">' + esc(doc.number) + '</div></div>' +
                    '<div class="doc-meta-block"><span class="doc-label">Date</span><div class="doc-meta-value">' + displayDate(doc.date) + '</div></div></div>' +
                '<div>' + (doc.remarks ? '<span class="doc-label">Remarks</span><div class="doc-meta-value">' + esc(doc.remarks) + '</div>' : '') +
                    (doc.paid ? '<span class="doc-paid">PAID</span>' : '') + '</div>' +
            '</section>' +
            '<table class="doc-items"><thead><tr>' +
                '<th class="c-no">No.</th><th class="c-desc">Description</th><th class="c-qty">Qty</th><th class="c-unit">Unit Price</th><th class="c-amt">Amount</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>' +
            '<div class="doc-total"><span class="doc-label">Total (HKD)</span><span class="doc-total-amount">' + money(docTotal(doc)) + '</span></div>' +
            '<div class="doc-spacer"></div>' +
            '<footer class="doc-foot">' +
                (showBank
                    ? '<div><span class="doc-label">Payment</span><div class="doc-payment">' +
                        esc([profile.paymentNote, profile.bankInfo].filter(Boolean).join('\n')) + '</div></div>'
                    : '') +
                (terms.length
                    ? '<div><span class="doc-label">Terms &amp; Conditions</span><ol class="doc-terms">' +
                        terms.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol></div>'
                    : '') +
                '<div class="doc-signs">' + clientSign +
                    '<div class="doc-sign doc-sign-own">' +
                        '<div class="doc-sign-space">' + signature + chop + '</div>' +
                        '<div class="doc-sign-rule"></div>' +
                        '<div class="doc-sign-name">' + esc(profile.signerName) + '</div>' +
                        '<div class="doc-sign-role">' + esc([profile.signerTitle, profile.companyName].filter(Boolean).join(', ')) + '</div>' +
                    '</div>' +
                '</div>' +
            '</footer>' +
        '</div>';

        $('#editorTotal').textContent = money(docTotal(doc));
        fitContent();
        fitPreview();
    }

    // 確保成張單擺得落一張 A4：先試縮細字，真係太長先變兩頁並提示
    const MIN_FONT_SCALE = 0.8;
    function fitContent() {
        const page = $('#docPage');
        const inner = $('.doc-inner', page);
        page.classList.remove('doc-long');
        let scale = 1;
        page.style.setProperty('--fs', scale);
        while (inner.offsetHeight > page.clientHeight + 1 && scale > MIN_FONT_SCALE) {
            scale = Math.round((scale - 0.04) * 100) / 100;
            page.style.setProperty('--fs', scale);
        }
        const status = $('#fitStatus');
        if (inner.offsetHeight > page.clientHeight + 1) {
            page.classList.add('doc-long');
            status.className = 'dz-fit dz-fit-over';
            status.textContent = '內容太長，一張 A4 放唔晒 (預覽紅線以下會印到第二頁)。可以刪短啲詳情或條款。';
            status.hidden = false;
        } else if (scale < 1) {
            status.className = 'dz-fit dz-fit-shrunk';
            status.textContent = '內容較多，已自動縮細字體 (' + Math.round(scale * 100) + '%) 確保擺得落一張 A4。';
            status.hidden = false;
        } else {
            status.hidden = true;
        }
    }

    // 預覽按闊度縮細
    function fitPreview() {
        const wrap = $('#previewWrap');
        const box = $('#previewBox');
        const page = $('#docPage');
        const styles = getComputedStyle(wrap);
        const available = wrap.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        const scale = Math.min(1, available / page.offsetWidth);
        page.style.transform = 'scale(' + scale + ')';
        box.style.width = page.offsetWidth * scale + 'px';
        box.style.height = page.offsetHeight * scale + 'px';
    }

    // ---------- 編輯表單 ----------
    function fillProfileSelects() {
        const options = settings.profiles.map(p => '<option value="' + esc(p.id) + '">' + esc(p.label) + '</option>').join('');
        $('#profileSelect').innerHTML = options;
        $('#settingsProfile').innerHTML = options;
        $('#profileField').hidden = settings.profiles.length < 2;
    }

    function fillTermSetSelect() {
        const match = matchingTermSet(current);
        $('#termSetSelect').innerHTML =
            '<option value="">' + (match === null ? '(已自行修改)' : '(冇條款)') + '</option>' +
            settings.termSets.map(t => '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>').join('');
        $('#termSetSelect').value = match || '';
    }

    function fillForm() {
        $$('[data-field]').forEach(el => {
            const value = current[el.dataset.field];
            if (el.type === 'checkbox') el.checked = !!value;
            else el.value = value == null ? '' : value;
        });
        $$('#typeSegment button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === current.type);
            btn.setAttribute('aria-selected', btn.dataset.type === current.type);
        });
        $('#btnToInvoice').hidden = current.type !== 'quotation';
        $('#btnToReceipt').hidden = current.type === 'receipt';
        fillTermSetSelect();
        renderAddItemSelect();
        renderItems();
        renderPreview();
    }

    function renderItems() {
        const list = $('#itemList');
        const template = $('#itemTemplate');
        list.innerHTML = '';
        current.items.forEach((item, index) => {
            const node = template.content.firstElementChild.cloneNode(true);
            node.dataset.index = index;
            $('.dz-item-no', node).textContent = '項目 ' + (index + 1);
            $$('[data-item]', node).forEach(input => {
                input.value = item[input.dataset.item] == null ? '' : item[input.dataset.item];
            });
            $('[data-action="up"]', node).disabled = index === 0;
            $('[data-action="down"]', node).disabled = index === current.items.length - 1;
            list.appendChild(node);
        });
    }

    function renderAddItemSelect() {
        const presets = settings.presets.filter(p => !p.profileId || p.profileId === current.profileId);
        const groups = {};
        presets.forEach(p => {
            const key = p.category || 'custom';
            (groups[key] = groups[key] || []).push(p);
        });
        $('#addItemSelect').innerHTML =
            '<option value="">＋ 加入項目…</option>' +
            '<option value="__blank">空白項目 (自己填)</option>' +
            Object.keys(groups).map(key =>
                '<optgroup label="' + esc(CATEGORY_NAMES[key] || key) + '">' +
                groups[key].map(p =>
                    '<option value="' + esc(p.id) + '">' + esc(p.label) +
                    (p.price ? ' — ' + money(p.price) + (p.unit ? '/' + esc(p.unit) : '') : '') + '</option>').join('') +
                '</optgroup>').join('');
    }

    function addBlankItem() {
        const items = current.items;
        if (!(items.length === 1 && isBlankItem(items[0]))) items.push(blankItem());
        markDirty();
        renderItems();
        renderPreview();
        focusLastItem();
    }

    function focusLastItem() {
        const titles = $$('#itemList [data-item="title"]');
        const last = titles[titles.length - 1];
        last.focus();
        last.closest('.dz-item').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function addPreset(id) {
        const preset = settings.presets.find(p => p.id === id);
        if (!preset) return;
        const item = {
            title: preset.title || '',
            details: preset.details || '',
            price: preset.price === undefined ? '' : preset.price,
            qty: preset.qty || 1,
            unit: preset.unit || '',
            priceText: preset.priceText || ''
        };
        const items = current.items;
        if (items.length === 1 && isBlankItem(items[0])) items[0] = item; else items.push(item);

        // 報價單條款未改過，就跟住項目類別轉範本
        if (current.type === 'quotation' && CATEGORY_TERMS.includes(preset.category)) {
            const match = matchingTermSet(current);
            if (match !== null) {
                const best = CATEGORY_TERMS.find(c => c === preset.category || c === match);
                if (best && best !== match) {
                    current.terms = termSetText(best, profileOf(current));
                    $('[data-field="terms"]').value = current.terms;
                    fillTermSetSelect();
                }
            }
        }
        markDirty();
        renderItems();
        renderPreview();
        focusLastItem();
    }

    function markDirty() {
        dirty = true;
        setStatus(isSaved(current) ? '有未儲存嘅改動' : '未儲存');
    }

    function setStatus(text) {
        $('#saveStatus').textContent = text;
    }

    // 由紀錄整理出客戶清單 (最近用過排先)
    function clientList() {
        const map = new Map();
        docs.forEach(d => {
            if (!d.toName) return;
            const key = d.toName.trim();
            const entry = map.get(key) || { name: key, count: 0, last: '', mobile: '', contact: '', profileId: d.profileId };
            entry.count++;
            if ((d.date || '') >= entry.last) {
                entry.last = d.date || '';
                entry.profileId = d.profileId;
                if (d.mobile || d.contact) {
                    entry.mobile = d.mobile || '';
                    entry.contact = d.contact || '';
                }
            }
            map.set(key, entry);
        });
        return Array.from(map.values()).sort((a, b) => b.last.localeCompare(a.last));
    }

    function renderClients() {
        const query = $('#clientSearch').value.trim().toLowerCase();
        const list = clientList().filter(c => !query ||
            [c.name, c.contact, c.mobile].join(' ').toLowerCase().includes(query));
        $('#clientCount').textContent = list.length + ' 個';
        $('#clientListBox').innerHTML = list.length
            ? list.map(c =>
                '<button type="button" class="dz-client-row" data-client="' + esc(c.name) + '">' +
                    '<strong>' + esc(c.name) + '</strong>' +
                    '<span>' + esc([c.contact, c.mobile].filter(Boolean).join(' · ') || '冇聯絡資料') + '</span>' +
                    '<span class="dz-client-meta">' + c.count + ' 張<br>' + displayDate(c.last) + '</span>' +
                '</button>').join('')
            : '<p class="dz-empty">' + (docs.length ? '搵唔到' : '未有舊客戶紀錄，可以喺「紀錄」匯入備份') + '</p>';
    }

    function pickClient(name) {
        const client = clientList().find(c => c.name === name);
        if (!client) return;
        current.toName = client.name;
        current.mobile = client.mobile;
        current.contact = client.contact;
        $('[data-field="toName"]').value = client.name;
        $('[data-field="mobile"]').value = client.mobile;
        $('[data-field="contact"]').value = client.contact;
        // 跟返上次用嘅抬頭 (例如顧問客)
        if (client.profileId && client.profileId !== current.profileId && settings.profiles.some(p => p.id === client.profileId)) {
            const select = $('[data-field="profileId"]');
            select.value = client.profileId;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        markDirty();
        renderPreview();
        $('#clientDialog').close();
    }

    function onFieldInput(e) {
        const el = e.target;
        const field = el.dataset.field;
        if (!field) return;
        const before = current[field];
        current[field] = el.type === 'checkbox' ? el.checked : el.value;
        if (field === 'number') current.numberEdited = true;
        if ((field === 'date' || field === 'profileId') && !current.numberEdited && !isSaved(current)) {
            current.number = nextNumber(current, current.id);
            $('[data-field="number"]').value = current.number;
        }
        if (field === 'profileId' && before !== current.profileId) {
            // 條款未改過就跟新抬頭嘅預設
            const oldProfile = settings.profiles.find(p => p.id === before) || settings.profiles[0];
            const oldDefault = termSetText(oldProfile.defaultTerms[current.type], oldProfile);
            if ((current.terms || '').trim() === oldDefault.trim()) {
                current.terms = typeDefaults(current.type, current.profileId).terms;
                $('[data-field="terms"]').value = current.terms;
            }
            fillTermSetSelect();
            renderAddItemSelect();
        }
        if (field === 'terms') fillTermSetSelect();
        markDirty();
        renderPreview();
    }

    function onItemInput(e) {
        const input = e.target;
        const key = input.dataset.item;
        if (!key) return;
        const index = Number(input.closest('.dz-item').dataset.index);
        current.items[index][key] = input.value;
        markDirty();
        renderPreview();
    }

    function onItemAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const index = Number(btn.closest('.dz-item').dataset.index);
        const items = current.items;
        const action = btn.dataset.action;
        if (action === 'preset') {
            saveItemAsPreset(items[index]);
            return;
        }
        if (action === 'remove') {
            if (items.length === 1) items[0] = blankItem(); else items.splice(index, 1);
        } else {
            const target = action === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= items.length) return;
            [items[index], items[target]] = [items[target], items[index]];
        }
        markDirty();
        renderItems();
        renderPreview();
    }

    function saveItemAsPreset(item) {
        if (!item.title) {
            alert('項目名稱未填');
            return;
        }
        settings.presets.push({
            id: 'u-' + newId(),
            profileId: current.profileId,
            category: 'custom',
            label: item.title.length > 18 ? item.title.slice(0, 18) + '…' : item.title,
            title: item.title,
            details: item.details,
            price: item.price === '' ? '' : Number(item.price),
            qty: Number(item.qty) || 1,
            unit: item.unit,
            priceText: item.priceText
        });
        saveSettings();
        renderAddItemSelect();
        setStatus('已存做快捷項目：' + item.title);
    }

    function switchType(type) {
        if (type === current.type) return;
        if (isSaved(current)) {
            // 已儲存嘅文件唔直接改類型，改為轉換
            convertTo(type);
            return;
        }
        const keepTerms = matchingTermSet(current) === null;
        const terms = current.terms;
        current.type = type;
        Object.assign(current, typeDefaults(type, current.profileId), keepTerms ? { terms } : {});
        if (!current.numberEdited) current.number = nextNumber(current, current.id);
        markDirty();
        fillForm();
    }

    // ---------- 動作 ----------
    function saveCurrent() {
        if (!current.number.trim()) {
            alert('請輸入編號');
            return false;
        }
        const clash = docs.find(d => d.id !== current.id && d.number.toLowerCase() === current.number.trim().toLowerCase());
        if (clash && !confirm('編號 ' + current.number + ' 已經用咗，照樣儲存？')) return false;

        const now = Date.now();
        current.number = current.number.trim();
        current.createdAt = current.createdAt || now;
        current.updatedAt = now;
        const copy = clone(current);
        const index = docs.findIndex(d => d.id === current.id);
        if (index >= 0) docs[index] = copy; else docs.push(copy);
        if (!writeJSON(DOCS_KEY, docs)) return false;
        dirty = false;
        setStatus('已儲存 ' + new Date(now).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }));
        return true;
    }

    function confirmDiscard() {
        return !dirty || confirm('有未儲存嘅改動，確定放棄？');
    }

    function loadDoc(doc) {
        current = Object.assign(newDoc(doc.type, doc.profileId), clone(doc));
        current.items = current.items.map(item => Object.assign(blankItem(), item));
        dirty = false;
        setStatus('已開啟 ' + current.number);
        fillForm();
    }

    function convertTo(type) {
        if (dirty && !saveCurrent()) return;
        const source = current;
        const doc = Object.assign(clone(source), typeDefaults(type, source.profileId), {
            id: newId(),
            type,
            date: todayISO(),
            numberEdited: false,
            remarks: source.number,
            note: '',
            createdAt: null,
            updatedAt: null
        });
        doc.number = nextNumber(doc);
        current = doc;
        dirty = true;
        fillForm();
        setStatus('由 ' + source.number + ' 轉成' + TYPES[type].zh + '，未儲存');
    }

    function duplicate() {
        if (dirty && !saveCurrent()) return;
        current = Object.assign(clone(current), {
            id: newId(),
            date: todayISO(),
            numberEdited: false,
            paid: false,
            note: '',
            createdAt: null,
            updatedAt: null
        });
        current.number = nextNumber(current);
        dirty = true;
        fillForm();
        setStatus('已複製，未儲存');
    }

    function printDoc() {
        const originalTitle = document.title;
        const restore = () => {
            document.title = originalTitle;
            window.removeEventListener('afterprint', restore);
        };
        // 存 PDF 時預設檔名用文件編號
        document.title = current.number + (current.toName ? ' ' + current.toName : '');
        window.addEventListener('afterprint', restore);
        window.print();
    }

    // ---------- 紀錄 ----------
    function renderHistory() {
        const type = $('#historyType').value;
        const query = $('#historySearch').value.trim().toLowerCase();
        const list = docs
            .filter(d => !type || d.type === type)
            .filter(d => !query || [d.number, d.toName, d.contact, d.remarks, d.note]
                .concat(d.items.map(i => i.title))
                .join(' ').toLowerCase().includes(query))
            .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0));

        $('#historyCount').textContent = list.length + ' 張';
        $('#historyList').innerHTML = list.length
            ? list.map(d =>
                '<div class="dz-history-row' + (current && d.id === current.id ? ' current' : '') + '" data-id="' + esc(d.id) + '">' +
                    '<div class="dz-history-main" data-open>' +
                        '<strong><span class="dz-badge dz-badge-' + d.type + '">' + TYPES[d.type].zh + '</span>' + esc(d.number) + '</strong>' +
                        '<span>' + displayDate(d.date) + ' · ' + esc(d.toName || '（未填客戶）') +
                            (settings.profiles.length > 1 && d.profileId && d.profileId !== settings.profiles[0].id ? ' · ' + esc(profileOf(d).label) : '') + '</span>' +
                        '<span>' + esc(d.items.map(i => i.title).filter(Boolean).join('、')) + '</span>' +
                        (d.note ? '<span class="dz-history-note">' + esc(d.note) + '</span>' : '') +
                    '</div>' +
                    '<div class="dz-history-side">' +
                        '<strong>' + money(docTotal(d)) + '</strong>' +
                        '<button class="dz-icon-btn dz-danger" data-delete title="刪除"><i class="fas fa-trash"></i></button>' +
                    '</div>' +
                '</div>').join('')
            : '<p class="dz-empty">未有紀錄</p>';
    }

    function onHistoryClick(e) {
        const row = e.target.closest('.dz-history-row');
        if (!row) return;
        const doc = docs.find(d => d.id === row.dataset.id);
        if (!doc) return;
        if (e.target.closest('[data-delete]')) {
            if (!confirm('刪除 ' + doc.number + '？呢個動作唔可以還原。')) return;
            docs = docs.filter(d => d.id !== doc.id);
            writeJSON(DOCS_KEY, docs);
            if (current.id === doc.id) markDirty();
            renderHistory();
            return;
        }
        if (e.target.closest('[data-open]')) {
            if (!confirmDiscard()) return;
            loadDoc(doc);
            $('#historyDialog').close();
        }
    }

    function exportBackup() {
        const data = { version: 2, exportedAt: new Date().toISOString(), documents: docs, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'documents-backup-' + todayISO() + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function importData(parsed) {
        const incoming = Array.isArray(parsed) ? parsed : parsed.documents;
        if (!Array.isArray(incoming)) throw new Error('format');
        let settingsNote = '';
        let added = 0;
        let updated = 0;
        if (parsed.settings && confirm('備份入面有設定 (公司資料、簽名、條款、快捷項目)，要用佢覆蓋而家嘅設定嗎？')) {
            settings = normalizeSettings(parsed.settings);
            saveSettings();
            fillProfileSelects();
            settingsNote = '，設定已更新';
        }
        incoming.forEach(doc => {
            if (!doc || !doc.id || !TYPES[doc.type] || !Array.isArray(doc.items)) return;
            // 舊紀錄只記低用邊個條款範本，匯入時先填返全文
            if (doc.terms === undefined) {
                const defaults = typeDefaults(doc.type, doc.profileId);
                Object.keys(defaults).forEach(key => {
                    if (doc[key] === undefined) doc[key] = defaults[key];
                });
                if (doc.termSet !== undefined) doc.terms = termSetText(doc.termSet, profileOf(doc));
            }
            delete doc.termSet;
            const index = docs.findIndex(d => d.id === doc.id);
            if (index < 0) {
                docs.push(doc);
                added++;
            } else if ((doc.updatedAt || 0) > (docs[index].updatedAt || 0)) {
                docs[index] = doc;
                updated++;
            }
        });
        writeJSON(DOCS_KEY, docs);
        return '匯入完成：新增 ' + added + ' 份，更新 ' + updated + ' 份' + settingsNote;
    }

    function importBackup(file) {
        const reader = new FileReader();
        reader.onload = () => {
            let message;
            try {
                message = importData(JSON.parse(reader.result));
            } catch (e) {
                alert('檔案格式唔啱');
                return;
            }
            renderHistory();
            fillForm();
            alert(message);
        };
        reader.readAsText(file);
    }

    // ---------- 設定 ----------
    function editingProfile() {
        return settings.profiles.find(p => p.id === settingsProfileId) || settings.profiles[0];
    }

    function fillSettings() {
        const profile = editingProfile();
        $('#settingsProfile').value = profile.id;
        $$('[data-pf]').forEach(el => { el.value = profile[el.dataset.pf] || ''; });
        $$('[data-pf-prefix]').forEach(el => { el.value = profile.prefixes[el.dataset.pfPrefix] || ''; });
        $$('[data-pf-img]').forEach(img => {
            const src = profile[img.dataset.pfImg];
            if (src) img.src = src; else img.removeAttribute('src');
        });
        $('#termSetEditor').innerHTML = settings.termSets.map(t =>
            '<label class="dz-field"><span>' + esc(t.name) + '</span>' +
            '<textarea rows="5" data-term-set="' + esc(t.id) + '">' + esc(t.text) + '</textarea></label>').join('');
        $('#presetEditor').innerHTML = settings.presets.map(p =>
            '<div class="dz-preset-row"><span>' + esc(p.label) +
            ' <small>' + esc(CATEGORY_NAMES[p.category] || '') + (p.price ? ' · ' + money(p.price) + (p.unit ? '/' + esc(p.unit) : '') : '') +
            (p.profileId && settings.profiles.length > 1 ? ' · ' + esc((settings.profiles.find(x => x.id === p.profileId) || {}).label || '') : '') +
            '</small></span>' +
            '<button class="dz-icon-btn dz-danger" data-delete-preset="' + esc(p.id) + '" title="刪除"><i class="fas fa-trash"></i></button></div>').join('');
    }

    function saveSettings() {
        writeJSON(SETTINGS_KEY, settings);
        if (current) renderPreview();
    }

    function onSettingInput(e) {
        const el = e.target;
        const profile = editingProfile();
        if (el.id === 'settingsProfile') {
            settingsProfileId = el.value;
            fillSettings();
            return;
        }
        if (el.dataset.pf) {
            profile[el.dataset.pf] = el.value;
            if (el.dataset.pf === 'label') {
                fillProfileSelects();
                $('#profileSelect').value = current.profileId;
                $('#settingsProfile').value = profile.id;
            }
        } else if (el.dataset.pfPrefix) {
            profile.prefixes[el.dataset.pfPrefix] = el.value;
        } else if (el.dataset.termSet) {
            const set = settings.termSets.find(t => t.id === el.dataset.termSet);
            if (set) set.text = el.value;
        } else {
            return;
        }
        saveSettings();
    }

    function onSettingClick(e) {
        const clear = e.target.closest('[data-pf-clear]');
        if (clear) {
            editingProfile()[clear.dataset.pfClear] = '';
            saveSettings();
            fillSettings();
            return;
        }
        const del = e.target.closest('[data-delete-preset]');
        if (del) {
            settings.presets = settings.presets.filter(p => p.id !== del.dataset.deletePreset);
            saveSettings();
            fillSettings();
            renderAddItemSelect();
        }
    }

    // 圖片縮細先存，避免撐爆 localStorage
    function loadImage(file, key) {
        const profile = editingProfile();
        const reader = new FileReader();
        reader.onload = () => {
            if (file.type === 'image/svg+xml') {
                profile[key] = reader.result;
                saveSettings();
                fillSettings();
                return;
            }
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 600 / img.width, 600 / img.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                profile[key] = canvas.toDataURL('image/png');
                saveSettings();
                fillSettings();
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    // ---------- 初始化 ----------
    function bindEvents() {
        const editor = $('.dz-editor');
        editor.addEventListener('input', e => {
            if (e.target.dataset.field) onFieldInput(e);
            else if (e.target.dataset.item) onItemInput(e);
        });
        editor.addEventListener('change', e => {
            if (e.target.dataset.field) onFieldInput(e);
        });
        $('#itemList').addEventListener('click', onItemAction);
        $('#addItemSelect').addEventListener('change', e => {
            const value = e.target.value;
            e.target.value = '';
            if (value === '__blank') addBlankItem();
            else if (value) addPreset(value);
        });
        $('#btnClients').addEventListener('click', () => {
            $('#clientSearch').value = '';
            renderClients();
            $('#clientDialog').showModal();
        });
        $('#clientSearch').addEventListener('input', renderClients);
        $('#clientListBox').addEventListener('click', e => {
            const row = e.target.closest('[data-client]');
            if (row) pickClient(row.dataset.client);
        });
        $('#termSetSelect').addEventListener('change', e => {
            const id = e.target.value;
            current.terms = id ? termSetText(id, profileOf(current)) : '';
            $('[data-field="terms"]').value = current.terms;
            fillTermSetSelect();
            markDirty();
            renderPreview();
        });

        $('#typeSegment').addEventListener('click', e => {
            const btn = e.target.closest('button[data-type]');
            if (btn) switchType(btn.dataset.type);
        });

        $('#btnSave').addEventListener('click', () => {
            if (saveCurrent()) fillForm();
        });
        $('#btnPrint').addEventListener('click', printDoc);
        $('#btnToInvoice').addEventListener('click', () => convertTo('invoice'));
        $('#btnToReceipt').addEventListener('click', () => convertTo('receipt'));
        $('#btnDuplicate').addEventListener('click', duplicate);
        $('#btnNew').addEventListener('click', () => {
            if (!confirmDiscard()) return;
            current = newDoc(current.type, current.profileId);
            dirty = false;
            setStatus('');
            fillForm();
        });

        $('#btnHistory').addEventListener('click', () => {
            renderHistory();
            $('#historyDialog').showModal();
        });
        $('#historyType').addEventListener('change', renderHistory);
        $('#historySearch').addEventListener('input', renderHistory);
        $('#historyList').addEventListener('click', onHistoryClick);
        $('#btnExport').addEventListener('click', exportBackup);
        $('#importFile').addEventListener('change', e => {
            if (e.target.files[0]) importBackup(e.target.files[0]);
            e.target.value = '';
        });

        $('#btnSettings').addEventListener('click', () => {
            settingsProfileId = current.profileId;
            fillSettings();
            $('#settingsDialog').showModal();
        });
        $('#settingsDialog').addEventListener('input', onSettingInput);
        $('#settingsDialog').addEventListener('change', e => {
            if (e.target.id === 'settingsProfile') onSettingInput(e);
            const upload = e.target.dataset.pfUpload;
            if (upload && e.target.files[0]) {
                loadImage(e.target.files[0], upload);
                e.target.value = '';
            }
        });
        $('#settingsDialog').addEventListener('click', onSettingClick);
        $('#settingsDialog').addEventListener('close', () => {
            fillTermSetSelect();
            renderAddItemSelect();
        });

        $$('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('dialog').close());
        });
        $$('dialog').forEach(dialog => {
            dialog.addEventListener('click', e => {
                if (e.target === dialog) dialog.close();
            });
        });

        window.addEventListener('resize', fitPreview);
        // 字型載入後字闊會變，要重新量過
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderPreview());
        window.addEventListener('beforeunload', e => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }

    // 俾外部 (例如匯入舊紀錄) 用
    window.yatonDocuments = {
        importData(data) {
            const message = importData(data);
            fillForm();
            return message;
        }
    };

    fillProfileSelects();
    current = newDoc('quotation');
    bindEvents();
    fillForm();
})();
