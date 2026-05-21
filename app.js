'use strict';

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

/** @type {string} Base URL da API Bynet */
const API_BASE_URL = 'https://api-gateway.techbynet.com';

/** Chave de armazenamento local da API Key */
const STORAGE_KEY_API = 'bynet_api_key';

/**
 * Retorna a API Key salva no localStorage.
 * @returns {string}
 */
function getApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) ?? '';
}

/** Dias para expiração do PIX */
const PIX_EXPIRES_IN_DAYS = 1;

// ─── PLANOS ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Plan
 * @property {string}  id           - Identificador único do plano
 * @property {string}  name         - Nome de exibição
 * @property {number}  priceInCents - Valor em centavos (exigido pela API)
 * @property {string}  priceLabel   - Preço formatado para exibição
 * @property {boolean} isPopular    - Destaca o card como popular
 */

/** @type {Plan[]} */
const PLANS = [
  { id: 'TP2',   name: 'TP2',   priceInCents: 12990, priceLabel: '129,90', isPopular: false },
  { id: 'TP3',   name: 'TP3',   priceInCents: 15990, priceLabel: '159,90', isPopular: false },
  { id: 'TP4',   name: 'TP4',   priceInCents: 17990, priceLabel: '179,90', isPopular: false },
  { id: 'TP5',   name: 'TP5',   priceInCents: 21000, priceLabel: '210,00', isPopular: true  },
  { id: 'TP5GO', name: 'TP5GO', priceInCents: 25990, priceLabel: '259,90', isPopular: false },
  { id: 'TP6',   name: 'TP6',   priceInCents: 30990, priceLabel: '309,90', isPopular: false },
  { id: 'TP7',   name: 'TP7',   priceInCents: 34990, priceLabel: '349,90', isPopular: false },
];

// ─── DOM REFERENCES ───────────────────────────────────────────────────────────

const plansGrid       = /** @type {HTMLElement} */ (document.getElementById('plans-grid'));
const modalOverlay    = /** @type {HTMLElement} */ (document.getElementById('modal-overlay'));
const modalClose      = /** @type {HTMLButtonElement} */ (document.getElementById('modal-close'));

// Form view
const viewForm        = /** @type {HTMLElement} */ (document.getElementById('view-form'));
const modalPlanLabel  = /** @type {HTMLElement} */ (document.getElementById('modal-plan-label'));
const pixForm         = /** @type {HTMLFormElement} */ (document.getElementById('pix-form'));
const fieldName       = /** @type {HTMLInputElement} */ (document.getElementById('field-name'));
const fieldEmail      = /** @type {HTMLInputElement} */ (document.getElementById('field-email'));
const fieldCpf        = /** @type {HTMLInputElement} */ (document.getElementById('field-cpf'));
const fieldPhone      = /** @type {HTMLInputElement} */ (document.getElementById('field-phone'));
const formError       = /** @type {HTMLElement} */ (document.getElementById('form-error'));
const btnGenerate     = /** @type {HTMLButtonElement} */ (document.getElementById('btn-generate'));
const btnGenerateText = /** @type {HTMLElement} */ (document.getElementById('btn-generate-text'));
const btnGenerateSpin = /** @type {HTMLElement} */ (document.getElementById('btn-generate-spinner'));

// PIX result view
const viewPix         = /** @type {HTMLElement} */ (document.getElementById('view-pix'));
const pixPlanLabel    = /** @type {HTMLElement} */ (document.getElementById('pix-plan-label'));
const qrContainer     = /** @type {HTMLElement} */ (document.getElementById('qr-container'));
const pixCodeField    = /** @type {HTMLTextAreaElement} */ (document.getElementById('pix-code-field'));
const btnCopyImage    = /** @type {HTMLButtonElement} */ (document.getElementById('btn-copy-image'));
const btnCopyCode     = /** @type {HTMLButtonElement} */ (document.getElementById('btn-copy-code'));
const btnCopyCodeText = /** @type {HTMLElement} */ (document.getElementById('btn-copy-code-text'));
const expiryInfo      = /** @type {HTMLElement} */ (document.getElementById('expiry-info'));
const btnNewPix       = /** @type {HTMLButtonElement} */ (document.getElementById('btn-new-pix'));

// Error view
const viewError       = /** @type {HTMLElement} */ (document.getElementById('view-error'));
const apiErrorMsg     = /** @type {HTMLElement} */ (document.getElementById('api-error-msg'));
const btnRetry        = /** @type {HTMLButtonElement} */ (document.getElementById('btn-retry'));

// Toast
const toastEl         = /** @type {HTMLElement} */ (document.getElementById('toast'));

// Settings
const btnSettings     = /** @type {HTMLButtonElement} */ (document.getElementById('btn-settings'));
const settingsOverlay = /** @type {HTMLElement} */ (document.getElementById('settings-overlay'));
const settingsClose   = /** @type {HTMLButtonElement} */ (document.getElementById('settings-close'));
const fieldApiKey     = /** @type {HTMLInputElement} */ (document.getElementById('field-apikey'));
const btnToggleApiKey = /** @type {HTMLButtonElement} */ (document.getElementById('btn-toggle-apikey'));
const settingsStatus  = /** @type {HTMLElement} */ (document.getElementById('settings-status'));
const btnSaveApiKey   = /** @type {HTMLButtonElement} */ (document.getElementById('btn-save-apikey'));
const btnClearApiKey  = /** @type {HTMLButtonElement} */ (document.getElementById('btn-clear-apikey'));

// ─── STATE ───────────────────────────────────────────────────────────────────

/** @type {Plan|null} */
let activePlan = null;

/** @type {number|null} */
let toastTimer = null;

// ─── SETTINGS MODAL ──────────────────────────────────────────────────────────

/**
 * Atualiza o indicador visual do botão de settings conforme a key está
 * salva ou não.
 */
function syncSettingsIndicator() {
  const hasKey = Boolean(getApiKey());
  btnSettings.classList.toggle('has-key', hasKey);
  btnSettings.title = hasKey
    ? 'API Key configurada ✓ — clique para alterar'
    : 'API Key não configurada — clique para inserir';
}

/** Abre o modal de configurações. */
function openSettings() {
  const saved = getApiKey();
  fieldApiKey.value = saved;
  setSettingsStatus(
    saved ? '✓ API Key salva. Você pode alterá-la abaixo.' : '',
    saved ? 'is-info' : ''
  );
  settingsOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => fieldApiKey.focus(), 250);
}

/** Fecha o modal de configurações. */
function closeSettings() {
  settingsOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}

/**
 * Exibe uma mensagem de status no modal de configurações.
 * @param {string} message
 * @param {'is-success'|'is-error'|'is-info'|''} cssClass
 */
function setSettingsStatus(message, cssClass) {
  settingsStatus.textContent  = message;
  settingsStatus.className    = `settings-status${cssClass ? ` ${cssClass}` : ''}`;
}

// Abrir settings
btnSettings.addEventListener('click', openSettings);

// Fechar pelo botão X
settingsClose.addEventListener('click', closeSettings);

// Fechar clicando fora
settingsOverlay.addEventListener('click', (evt) => {
  if (evt.target === settingsOverlay) closeSettings();
});

// Fechar com Escape (captura antes do modal de pagamento)
document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && settingsOverlay.classList.contains('is-open')) {
    closeSettings();
  }
});

// Toggle visibilidade da key
btnToggleApiKey.addEventListener('click', () => {
  const isHidden = fieldApiKey.type === 'password';
  fieldApiKey.type = isHidden ? 'text' : 'password';
  // Swap ícone olho / olho-riscado
  btnToggleApiKey.innerHTML = isHidden
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`;
});

// Salvar API key
btnSaveApiKey.addEventListener('click', () => {
  const rawKey = fieldApiKey.value.trim();

  if (!rawKey) {
    setSettingsStatus('⚠ Cole a API Key antes de salvar.', 'is-error');
    fieldApiKey.focus();
    return;
  }

  localStorage.setItem(STORAGE_KEY_API, rawKey);
  syncSettingsIndicator();
  setSettingsStatus('✓ API Key salva com sucesso!', 'is-success');
  showToast('API Key salva!', 'success');

  // Fecha o modal após 1.2s para o usuário ver a confirmação
  setTimeout(closeSettings, 1200);
});

// Remover API key
btnClearApiKey.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY_API);
  fieldApiKey.value = '';
  syncSettingsIndicator();
  setSettingsStatus('Chave removida. Insira uma nova para continuar.', 'is-info');
  showToast('API Key removida.', 'error');
});

// ─── RENDER PLAN CARDS ────────────────────────────────────────────────────────

/**
 * Renderiza todos os cards de planos no grid.
 */
function renderPlanCards() {
  plansGrid.innerHTML = '';

  PLANS.forEach((plan) => {
    const card = buildPlanCard(plan);
    plansGrid.appendChild(card);
  });
}

/**
 * Constrói o elemento HTML de um card de plano.
 * @param {Plan} plan
 * @returns {HTMLElement}
 */
function buildPlanCard(plan) {
  const card = document.createElement('article');
  card.className = `plan-card${plan.isPopular ? ' plan-card--popular' : ''}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Selecionar plano ${plan.name} por R$ ${plan.priceLabel}/mês`);

  card.innerHTML = `
    ${plan.isPopular ? '<span class="plan-badge">Popular</span>' : ''}
    <p class="plan-card__tier">Plano</p>
    <h2 class="plan-card__name">${escapeHtml(plan.name)}</h2>
    <div class="plan-card__price-row">
      <span class="plan-card__currency">R$</span>
      <span class="plan-card__amount">${escapeHtml(plan.priceLabel)}</span>
      <span class="plan-card__period">/mês</span>
    </div>
    <button class="plan-card__btn" id="btn-plan-${escapeHtml(plan.id)}">
      Gerar PIX
    </button>
  `;

  // Click on card or button opens modal
  card.addEventListener('click', () => openModal(plan));
  card.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      openModal(plan);
    }
  });

  return card;
}

// ─── MODAL LOGIC ─────────────────────────────────────────────────────────────

/**
 * Abre o modal com o plano selecionado.
 * @param {Plan} plan
 */
function openModal(plan) {
  activePlan = plan;
  showView('form');

  modalPlanLabel.textContent = `Plano ${plan.name} — R$ ${plan.priceLabel}/mês`;
  pixForm.reset();
  clearFieldErrors();
  formError.textContent = '';

  modalOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // Focus first field after transition
  setTimeout(() => fieldName.focus(), 250);
}

/**
 * Fecha o modal e reseta estado.
 */
function closeModal() {
  modalOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
  activePlan = null;
}

/**
 * Alterna entre as três views do modal: 'form' | 'pix' | 'error'
 * @param {'form'|'pix'|'error'} view
 */
function showView(view) {
  viewForm.hidden  = view !== 'form';
  viewPix.hidden   = view !== 'pix';
  viewError.hidden = view !== 'error';
}

// Close on overlay click
modalOverlay.addEventListener('click', (evt) => {
  if (evt.target === modalOverlay) closeModal();
});

// Close on button click
modalClose.addEventListener('click', closeModal);

// Close on Escape key
document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape' && modalOverlay.classList.contains('is-open')) {
    closeModal();
  }
});

// Retry button resets to form view
btnRetry.addEventListener('click', () => showView('form'));

// New PIX button resets to form view
btnNewPix.addEventListener('click', () => {
  showView('form');
  pixForm.reset();
  clearFieldErrors();
  formError.textContent = '';
  setTimeout(() => fieldName.focus(), 50);
});

// ─── INPUT MASKS ─────────────────────────────────────────────────────────────

/**
 * Aplica máscara de CPF: 000.000.000-00
 * @param {Event} evt
 */
function handleCpfMask(evt) {
  const input = /** @type {HTMLInputElement} */ (evt.target);
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) {
    v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  } else if (v.length > 3) {
    v = v.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  }
  input.value = v;
}

/**
 * Aplica máscara de telefone: (00) 00000-0000
 * @param {Event} evt
 */
function handlePhoneMask(evt) {
  const input = /** @type {HTMLInputElement} */ (evt.target);
  let v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else {
    v = v.replace(/^(\d*)/, '($1');
  }
  input.value = v;
}

fieldCpf.addEventListener('input', handleCpfMask);
fieldPhone.addEventListener('input', handlePhoneMask);

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Remove classes de erro de todos os campos do formulário.
 */
function clearFieldErrors() {
  [fieldName, fieldEmail, fieldCpf, fieldPhone].forEach((el) =>
    el.classList.remove('is-invalid')
  );
}

/**
 * Valida o CPF usando o algoritmo oficial.
 * @param {string} cpf - CPF sem máscara
 * @returns {boolean}
 */
function isValidCpf(cpf) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (slice, weight) =>
    slice.reduce((sum, digit, idx) => sum + Number(digit) * (weight - idx), 0);

  const digits = cpf.split('');

  const remainder1 = calcDigit(digits.slice(0, 9), 10) % 11;
  const digit1     = remainder1 < 2 ? 0 : 11 - remainder1;
  if (digit1 !== Number(digits[9])) return false;

  const remainder2 = calcDigit(digits.slice(0, 10), 11) % 11;
  const digit2     = remainder2 < 2 ? 0 : 11 - remainder2;
  return digit2 === Number(digits[10]);
}

/**
 * Valida o formulário e retorna um objeto com os dados limpos ou null se inválido.
 * @returns {{ name: string, email: string, cpf: string, phone: string }|null}
 */
function validateForm() {
  clearFieldErrors();
  formError.textContent = '';

  const name  = fieldName.value.trim();
  const email = fieldEmail.value.trim().toLowerCase();
  const cpf   = fieldCpf.value.replace(/\D/g, '');
  const phone = fieldPhone.value.replace(/\D/g, '');

  /** @type {string[]} */
  const errors = [];

  if (name.length < 3) {
    fieldName.classList.add('is-invalid');
    errors.push('Nome deve ter pelo menos 3 caracteres.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldEmail.classList.add('is-invalid');
    errors.push('E-mail inválido.');
  }

  if (!isValidCpf(cpf)) {
    fieldCpf.classList.add('is-invalid');
    errors.push('CPF inválido.');
  }

  if (phone.length < 10 || phone.length > 11) {
    fieldPhone.classList.add('is-invalid');
    errors.push('Telefone inválido.');
  }

  if (errors.length > 0) {
    formError.textContent = errors[0];
    return null;
  }

  return { name, email, cpf, phone };
}

// ─── PIX GENERATION ──────────────────────────────────────────────────────────

pixForm.addEventListener('submit', async (evt) => {
  evt.preventDefault();

  // Guard: sem API Key configurada
  const currentApiKey = getApiKey();
  if (!currentApiKey) {
    showToast('Configure sua API Key antes de gerar o PIX.', 'error');
    openSettings();
    return;
  }

  const formData = validateForm();
  if (!formData || !activePlan) return;

  setLoadingState(true);

  try {
    const pixString = await createPixTransaction(formData, activePlan, currentApiKey);
    renderPixResult(pixString, activePlan); // renderPixResult agora é síncrono
    showView('pix');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido. Tente novamente.';
    apiErrorMsg.textContent = message;
    showView('error');
  } finally {
    setLoadingState(false);
  }
});

/**
 * Alterna o estado de loading do botão de geração.
 * @param {boolean} isLoading
 */
function setLoadingState(isLoading) {
  btnGenerate.disabled        = isLoading;
  btnGenerateText.hidden      = isLoading;
  btnGenerateSpin.hidden      = !isLoading;
}

/**
 * Realiza a chamada POST à API Bynet para criar a transação PIX.
 * Retorna a string do QR Code (EMV) para ser usada no copia-e-cola e no QR Code visual.
 *
 * @param {{ name: string, email: string, cpf: string, phone: string }} customerData
 * @param {Plan}   plan
 * @param {string} apiKey - API Key lida do localStorage
 * @returns {Promise<string>} EMV string do PIX
 */
async function createPixTransaction(customerData, plan, apiKey) {
  /** @type {string} Referência externa única para idempotência */
  const externalRef = `${plan.id}-${Date.now()}`;

  const requestBody = {
    amount:        plan.priceInCents,
    paymentMethod: 'PIX',
    customer: {
      name:        customerData.name,
      email:       customerData.email,
      document: {
        number: customerData.cpf,
        type:   'CPF',
      },
      phone:       customerData.phone,
      externalRef: externalRef,
      address: {
        street:       'Rua não informada',
        streetNumber: '0',
        complement:   '',
        zipCode:      '00000000',
        neighborhood: 'Não informado',
        city:         'Não informada',
        state:        'SP',
        country:      'br',
      },
    },
    shipping: {
      fee: 0,
      address: {
        street:       'Rua não informada',
        streetNumber: '0',
        complement:   '',
        zipCode:      '00000000',
        neighborhood: 'Não informado',
        city:         'Não informada',
        state:        'SP',
        country:      'br',
      },
    },
    items: [
      {
        title:       `Mensalidade ${plan.name}`,
        unitPrice:   plan.priceInCents,
        quantity:    1,
        tangible:    false,
        externalRef: plan.id,
      },
    ],
    pix: {
      expiresInDays: PIX_EXPIRES_IN_DAYS,
    },
    metadata: JSON.stringify({ plan: plan.id, externalRef }),
  };

  const response = await fetch(`${API_BASE_URL}/api/user/transactions`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
      'User-Agent':   'AtivoB2B/1.0',
    },
    body: JSON.stringify(requestBody),
  });

  // HTTP-level error
  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = errorBody?.message ?? '';
    } catch {
      // Response body not JSON — ignore
    }
    throw new Error(
      `Falha ao criar transação (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`
    );
  }

  const responseBody = await response.json();

  // API-level error (status !== 200 inside body)
  if (responseBody.status !== 200) {
    throw new Error(responseBody.message ?? 'A API retornou um erro inesperado.');
  }

  // Extract the PIX EMV string from the response
  const pixQrcode = responseBody?.data?.pix?.qrcode ?? responseBody?.data?.qrCode ?? null;

  if (!pixQrcode) {
    throw new Error('A API não retornou o código PIX. Verifique o token de autenticação.');
  }

  return /** @type {string} */ (pixQrcode);
}

// ─── QR CODE RENDERING ───────────────────────────────────────────────────────

/**
 * Renderiza o QR Code no container e preenche os campos de resultado.
 * Usa a biblioteca qrcodejs (new QRCode) que é mais robusta para uso via CDN.
 * @param {string} pixString - EMV string do PIX
 * @param {Plan}   plan
 * @returns {void}
 */
function renderPixResult(pixString, plan) {
  pixPlanLabel.textContent = `Plano ${plan.name} — R$ ${plan.priceLabel}/mês`;
  pixCodeField.value       = pixString;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + PIX_EXPIRES_IN_DAYS);
  expiryInfo.textContent = `⏱ Expira em: ${formatDate(expirationDate)}`;

  // Limpa QR Code anterior antes de gerar um novo
  qrContainer.innerHTML = '';

  // qrcodejs cria um <canvas> (e um <img> de fallback) dentro do container
  // eslint-disable-next-line no-new
  new QRCode(qrContainer, {
    text:          pixString,
    width:         240,
    height:        240,
    colorDark:     '#000000',
    colorLight:    '#ffffff',
    correctLevel:  QRCode.CorrectLevel.M,
  });
}

/**
 * Formata uma Date para exibição legível.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─── CLIPBOARD ACTIONS ───────────────────────────────────────────────────────

/**
 * Copia o texto do código PIX para a área de transferência.
 */
btnCopyCode.addEventListener('click', async () => {
  const code = pixCodeField.value;
  if (!code) return;

  const success = await copyTextToClipboard(code);

  if (success) {
    btnCopyCode.classList.add('is-copied');
    btnCopyCodeText.textContent = '✓ Copiado!';
    showToast('Código PIX copiado!', 'success');
    setTimeout(() => {
      btnCopyCode.classList.remove('is-copied');
      btnCopyCodeText.textContent = 'Copiar código';
    }, 2500);
  } else {
    showToast('Não foi possível copiar. Selecione manualmente.', 'error');
  }
});

/**
 * Copia a imagem do QR Code para a área de transferência como PNG.
 * Usa a Clipboard API moderna (ClipboardItem). Fallback: faz download da imagem.
 * O qrcodejs gera um <canvas> dentro do #qr-container.
 */
btnCopyImage.addEventListener('click', async () => {
  // qrcodejs gera um canvas dentro do container
  const canvas = /** @type {HTMLCanvasElement|null} */ (qrContainer.querySelector('canvas'));

  if (!canvas) {
    showToast('QR Code ainda não foi gerado.', 'error');
    return;
  }

  try {
    const blob = await canvasToBlob(canvas);

    if (navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      showToast('Imagem do QR Code copiada!', 'success');
    } else {
      downloadBlob(blob, `qr-pix-${activePlan?.id ?? 'plano'}.png`);
      showToast('QR Code baixado (navegador não suporta copiar imagem).', 'success');
    }
  } catch {
    try {
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, `qr-pix-${activePlan?.id ?? 'plano'}.png`);
      showToast('QR Code baixado como arquivo PNG.', 'success');
    } catch {
      showToast('Não foi possível copiar a imagem.', 'error');
    }
  }
});

/**
 * Converte um HTMLCanvasElement para um Blob PNG.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob retornou null.'));
    }, 'image/png');
  });
}

/**
 * Faz download de um Blob como arquivo.
 * @param {Blob}   blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Copia texto para a área de transferência.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Legacy fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  } catch {
    return false;
  }
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

/**
 * Exibe uma notificação toast temporária.
 * @param {string}            message
 * @param {'success'|'error'} type
 * @param {number}            [duration=3000]
 */
function showToast(message, type, duration = 3000) {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toastEl.textContent = message;
  toastEl.className   = `toast toast--${type} is-visible`;

  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove('is-visible');
    toastTimer = null;
  }, duration);
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS na renderização dinâmica.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(str).replace(/[&<>"']/g, (c) => ESCAPE_MAP[c] ?? c);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

/**
 * Ponto de entrada da aplicação.
 */
function init() {
  renderPlanCards();
  syncSettingsIndicator();
}

init();
