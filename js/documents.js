// 報價單 / 發票 / 收據 工具
(function () {
    'use strict';

    const DOCS_KEY = 'yatonDocuments';
    const SETTINGS_KEY = 'yatonDocumentSettings';

    const TYPES = {
        quotation: { title: 'QUOTATION', zh: '報價單', prefix: 'Q', numberLabel: 'Quotation' },
        invoice: { title: 'INVOICE', zh: '發票', prefix: 'Inv', numberLabel: 'Invoice' },
        receipt: { title: 'RECEIPT', zh: '收據', prefix: 'Rec', numberLabel: 'Receipt' }
    };

    const DEFAULT_TERMS = {
        quotation: [
            'All services are defined in the quotation and no extra items will be included.',
            'When this quotation is signed, client cannot terminate and refund the contract before finish date.',
            'Yat On Sport Association reserves the right of final decision on the interpretation if any disputes arise.',
            'All payments should be made payable to 「Yat On Sport Association Limited」 by a crossed cheque.'
        ].join('\n'),
        invoice: [
            'All services are defined in the quotation and no extra items will be included.',
            'Yat On Sport Association reserves the right of final decision on the interpretation if any disputes arise.',
            'All payments should be made payable to 「Yat On Sport Association Limited」 by a crossed cheque.'
        ].join('\n'),
        receipt: ''
    };

    const DEFAULT_SETTINGS = {
        companyName: 'Yat On Sport Association Limited',
        phone: '62001654 (Mr.Kwok)',
        social: 'yatonsa',
        address: '',
        paymentNote: '支票請開以下的帳戶',
        bankInfo: '',
        signerName: 'Eric Kwok',
        signerTitle: 'Founder',
        signature: '',
        terms: DEFAULT_TERMS
    };

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

    function loadSettings() {
        const saved = readJSON(SETTINGS_KEY, {});
        return Object.assign({}, DEFAULT_SETTINGS, saved, {
            terms: Object.assign({}, DEFAULT_TERMS, saved.terms || {})
        });
    }

    let settings = loadSettings();
    let docs = readJSON(DOCS_KEY, []);
    let current = null;
    let dirty = false;

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

    function itemAmount(item) {
        return (Number(item.price) || 0) * (Number(item.qty) || 0);
    }

    function docTotal(doc) {
        return doc.items.reduce((sum, item) => sum + itemAmount(item), 0);
    }

    // 編號格式跟舊範本：Q / Inv / Rec + YYYYMMDD + 兩位流水號
    function nextNumber(type, dateISO, excludeId) {
        const base = TYPES[type].prefix + (dateISO || todayISO()).replace(/-/g, '');
        let max = 0;
        docs.forEach(doc => {
            if (doc.id === excludeId || !doc.number || !doc.number.startsWith(base)) return;
            const seq = parseInt(doc.number.slice(base.length), 10);
            if (seq > max) max = seq;
        });
        return base + String(max + 1).padStart(2, '0');
    }

    function blankItem() {
        return { title: '', details: '', price: '', qty: 1, unit: '' };
    }

    function typeDefaults(type) {
        return {
            terms: settings.terms[type] || '',
            showBank: type !== 'receipt',
            showClientSign: type === 'quotation',
            showSignature: type === 'receipt',
            paid: false
        };
    }

    function newDoc(type) {
        const date = todayISO();
        return Object.assign({
            id: newId(),
            type,
            number: nextNumber(type, date),
            numberEdited: false,
            date,
            toName: '',
            contact: '',
            mobile: '',
            remarks: '',
            items: [blankItem()],
            createdAt: null,
            updatedAt: null
        }, typeDefaults(type));
    }

    function isSaved(doc) {
        return docs.some(d => d.id === doc.id);
    }

    // ---------- 預覽 ----------
    function renderPreview() {
        const doc = current;
        const type = TYPES[doc.type];
        const company = [settings.companyName, settings.phone, settings.social, settings.address]
            .filter(Boolean).map(esc).join('\n');
        const to = doc.toName ? esc(doc.toName) : '';
        const mobile = [doc.mobile, doc.contact ? '(' + doc.contact + ')' : ''].filter(Boolean).join(' ');

        const rows = doc.items.map((item, i) => {
            const amount = itemAmount(item);
            const qty = Number(item.qty) || 0;
            const unit = item.unit ? '/' + esc(item.unit) : '';
            let price;
            if (qty === 1 && !item.unit) {
                price = money(amount);
            } else {
                price = money(item.price) + unit +
                    '<span class="doc-item-calc">× ' + esc(qty) + ' = ' + money(amount) + '</span>';
            }
            return '<tr><td>' +
                '<div class="doc-item-title">(' + (i + 1) + ') ' + esc(item.title) + '</div>' +
                (item.details ? '<div class="doc-item-details">' + esc(item.details) + '</div>' : '') +
                '</td><td>' + (item.title || item.price ? price : '') + '</td></tr>';
        }).join('');

        const terms = (doc.terms || '').split('\n').map(t => t.trim()).filter(Boolean);
        const showBank = doc.showBank && (settings.paymentNote || settings.bankInfo);

        const signature = doc.showSignature && settings.signature
            ? '<img src="' + esc(settings.signature) + '" alt="">' : '';

        const clientSign = doc.showClientSign
            ? '<div class="doc-sign doc-client-sign">' +
                '<div class="doc-sign-space"></div>' +
                '<div class="doc-sign-line">Client Signature with Company Chop</div>' +
                '<div class="doc-sign-line">Client Person Name and Title</div>' +
                '<div class="doc-sign-line">Date of Contract (DD/MM/YYYY)</div>' +
              '</div>'
            : '';

        $('#docPage').innerHTML =
            '<div class="doc-company">' + company + '</div>' +
            '<div class="doc-title"><span class="doc-mark"></span>' + type.title + '</div>' +
            '<div class="doc-meta">' +
                '<div>' + type.numberLabel + ': ' + esc(doc.number) + '</div>' +
                '<div>Date: ' + displayDate(doc.date) + '</div>' +
                '<div>To: ' + to + '</div>' +
                '<div>Mobile: ' + esc(mobile) + '</div>' +
                '<div>Remarks: ' + esc(doc.remarks) + '</div>' +
            '</div>' +
            (doc.paid ? '<div class="doc-paid">PAID</div>' : '') +
            '<table class="doc-items"><thead><tr><th>DESCRIPTION</th><th>PRICE (HKD)</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table>' +
            '<div class="doc-spacer"></div>' +
            (showBank
                ? '<div class="doc-payment">' +
                    (settings.paymentNote ? '<div class="doc-payment-note">' + esc(settings.paymentNote) + '</div>' : '') +
                    esc(settings.bankInfo) +
                  '</div>'
                : '') +
            '<div class="doc-rule"></div>' +
            '<div class="doc-total"><span>Total:</span><span class="doc-total-amount">' + money(docTotal(doc)) + '</span></div>' +
            (terms.length
                ? '<ol class="doc-terms">' + terms.map(t => '<li>' + esc(t) + '</li>').join('') + '</ol>'
                : '') +
            '<div class="doc-signs">' + clientSign +
                '<div class="doc-sign doc-sign-own">' +
                    '<div class="doc-sign-space">' + signature + '</div>' +
                    '<div class="doc-sign-line">' + esc(settings.signerName) + '</div>' +
                    '<div class="doc-sign-title">' + esc(settings.signerTitle) + '</div>' +
                '</div>' +
            '</div>';

        $('#editorTotal').textContent = money(docTotal(doc));
        fitPreview();
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

    function markDirty() {
        dirty = true;
        setStatus(isSaved(current) ? '有未儲存嘅改動' : '未儲存');
    }

    function setStatus(text) {
        $('#saveStatus').textContent = text;
    }

    function updateClientList() {
        const names = Array.from(new Set(docs.map(d => d.toName).filter(Boolean))).sort();
        $('#clientList').innerHTML = names.map(n => '<option value="' + esc(n) + '">').join('');
    }

    // 揀返舊客戶時自動填返電話同聯絡人
    function autofillClient(name) {
        if (current.mobile || current.contact) return;
        const match = docs.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .find(d => d.toName === name);
        if (!match) return;
        current.mobile = match.mobile;
        current.contact = match.contact;
        $('[data-field="mobile"]').value = match.mobile || '';
        $('[data-field="contact"]').value = match.contact || '';
    }

    function onFieldInput(e) {
        const el = e.target;
        const field = el.dataset.field;
        if (!field) return;
        current[field] = el.type === 'checkbox' ? el.checked : el.value;
        if (field === 'number') current.numberEdited = true;
        if (field === 'date' && !current.numberEdited && !isSaved(current)) {
            current.number = nextNumber(current.type, current.date, current.id);
            $('[data-field="number"]').value = current.number;
        }
        if (field === 'toName' && e.type === 'change') autofillClient(el.value);
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
        if (btn.dataset.action === 'remove') {
            if (items.length === 1) {
                items[0] = blankItem();
            } else {
                items.splice(index, 1);
            }
        } else {
            const target = btn.dataset.action === 'up' ? index - 1 : index + 1;
            if (target < 0 || target >= items.length) return;
            [items[index], items[target]] = [items[target], items[index]];
        }
        markDirty();
        renderItems();
        renderPreview();
    }

    function switchType(type) {
        if (type === current.type) return;
        if (isSaved(current)) {
            // 已儲存嘅文件唔直接改類型，改為轉換
            convertTo(type);
            return;
        }
        const wasDefaultTerms = current.terms === (settings.terms[current.type] || '');
        current.type = type;
        Object.assign(current, typeDefaults(type), wasDefaultTerms ? {} : { terms: current.terms });
        if (!current.numberEdited) current.number = nextNumber(type, current.date, current.id);
        markDirty();
        fillForm();
    }

    // ---------- 動作 ----------
    function saveCurrent() {
        if (!current.number.trim()) {
            alert('請輸入編號');
            return false;
        }
        const clash = docs.find(d => d.id !== current.id && d.number === current.number.trim());
        if (clash && !confirm('編號 ' + current.number + ' 已經用咗，照樣儲存？')) return false;

        const now = Date.now();
        current.number = current.number.trim();
        current.createdAt = current.createdAt || now;
        current.updatedAt = now;
        const copy = JSON.parse(JSON.stringify(current));
        const index = docs.findIndex(d => d.id === current.id);
        if (index >= 0) docs[index] = copy; else docs.push(copy);
        if (!writeJSON(DOCS_KEY, docs)) return false;
        dirty = false;
        updateClientList();
        setStatus('已儲存 ' + new Date(now).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }));
        return true;
    }

    function confirmDiscard() {
        return !dirty || confirm('有未儲存嘅改動，確定放棄？');
    }

    function loadDoc(doc) {
        current = JSON.parse(JSON.stringify(doc));
        dirty = false;
        setStatus('已開啟 ' + current.number);
        fillForm();
    }

    function convertTo(type) {
        if (dirty && !saveCurrent()) return;
        const source = current;
        const date = todayISO();
        const doc = Object.assign(JSON.parse(JSON.stringify(source)), typeDefaults(type), {
            id: newId(),
            type,
            date,
            number: nextNumber(type, date),
            numberEdited: false,
            remarks: source.number,
            createdAt: null,
            updatedAt: null
        });
        current = doc;
        dirty = true;
        fillForm();
        setStatus('由 ' + source.number + ' 轉成' + TYPES[type].zh + '，未儲存');
    }

    function duplicate() {
        if (dirty && !saveCurrent()) return;
        const date = todayISO();
        current = Object.assign(JSON.parse(JSON.stringify(current)), {
            id: newId(),
            date,
            number: nextNumber(current.type, date),
            numberEdited: false,
            paid: false,
            createdAt: null,
            updatedAt: null
        });
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
            .filter(d => !query || [d.number, d.toName, d.contact, d.remarks]
                .concat(d.items.map(i => i.title))
                .join(' ').toLowerCase().includes(query))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        $('#historyList').innerHTML = list.length
            ? list.map(d =>
                '<div class="dz-history-row' + (current && d.id === current.id ? ' current' : '') + '" data-id="' + esc(d.id) + '">' +
                    '<div class="dz-history-main" data-open>' +
                        '<strong><span class="dz-badge dz-badge-' + d.type + '">' + TYPES[d.type].zh + '</span>' + esc(d.number) + '</strong>' +
                        '<span>' + displayDate(d.date) + ' · ' + esc(d.toName || '（未填客戶）') + '</span>' +
                        '<span>' + esc(d.items.map(i => i.title).filter(Boolean).join('、')) + '</span>' +
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
            updateClientList();
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
        const data = { version: 1, exportedAt: new Date().toISOString(), documents: docs };
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

    function importBackup(file) {
        const reader = new FileReader();
        reader.onload = () => {
            let incoming;
            try {
                const parsed = JSON.parse(reader.result);
                incoming = Array.isArray(parsed) ? parsed : parsed.documents;
                if (!Array.isArray(incoming)) throw new Error('format');
            } catch (e) {
                alert('檔案格式唔啱');
                return;
            }
            let added = 0;
            let updated = 0;
            incoming.forEach(doc => {
                if (!doc || !doc.id || !TYPES[doc.type] || !Array.isArray(doc.items)) return;
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
            updateClientList();
            renderHistory();
            alert('匯入完成：新增 ' + added + ' 份，更新 ' + updated + ' 份');
        };
        reader.readAsText(file);
    }

    // ---------- 設定 ----------
    function fillSettings() {
        $$('[data-setting]').forEach(el => { el.value = settings[el.dataset.setting] || ''; });
        $$('[data-setting-terms]').forEach(el => { el.value = settings.terms[el.dataset.settingTerms] || ''; });
        const preview = $('#signaturePreview');
        if (settings.signature) preview.src = settings.signature;
        else preview.removeAttribute('src');
    }

    function saveSettings() {
        writeJSON(SETTINGS_KEY, settings);
        renderPreview();
    }

    function onSettingInput(e) {
        const el = e.target;
        if (el.dataset.setting) {
            settings[el.dataset.setting] = el.value;
        } else if (el.dataset.settingTerms) {
            settings.terms[el.dataset.settingTerms] = el.value;
        } else {
            return;
        }
        saveSettings();
    }

    // 簽名圖縮細先存，避免撐爆 localStorage
    function loadSignature(file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 600 / img.width, 300 / img.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                settings.signature = canvas.toDataURL('image/png');
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

        $('#typeSegment').addEventListener('click', e => {
            const btn = e.target.closest('button[data-type]');
            if (btn) switchType(btn.dataset.type);
        });

        $('#btnAddItem').addEventListener('click', () => {
            current.items.push(blankItem());
            markDirty();
            renderItems();
            renderPreview();
            const titles = $$('#itemList [data-item="title"]');
            titles[titles.length - 1].focus();
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
            current = newDoc(current.type);
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
            fillSettings();
            $('#settingsDialog').showModal();
        });
        $('#settingsDialog').addEventListener('input', onSettingInput);
        $('#signatureFile').addEventListener('change', e => {
            if (e.target.files[0]) loadSignature(e.target.files[0]);
            e.target.value = '';
        });
        $('#btnClearSignature').addEventListener('click', () => {
            settings.signature = '';
            saveSettings();
            fillSettings();
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
        window.addEventListener('beforeunload', e => {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }

    current = newDoc('quotation');
    bindEvents();
    updateClientList();
    fillForm();
})();
