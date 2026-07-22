import anime from 'animejs';
import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import { fetchLeaderboard, recordStampClick } from './lib/api.js';
import { MP_DATA, getConstituenciesForState, getRandomEmailTemplate } from './lib/mpData.js';

// Regional metadata mapping for localized visual customization
const STATE_ZONES = {
  'Kerala': { zone: 'SOUTHERN ZONE', code: 'KL', accent: '#10b981' },
  'Tamil Nadu': { zone: 'SOUTHERN ZONE', code: 'TN', accent: '#0284c7' },
  'Karnataka': { zone: 'SOUTHERN ZONE', code: 'KA', accent: '#7c3aed' },
  'Andhra Pradesh': { zone: 'SOUTHERN ZONE', code: 'AP', accent: '#0d9488' },
  'Telangana': { zone: 'SOUTHERN ZONE', code: 'TS', accent: '#d97706' },

  'Delhi (NCT)': { zone: 'CAPITAL REGION', code: 'DL', accent: '#dc2626' },
  'Uttar Pradesh': { zone: 'NORTHERN REGION', code: 'UP', accent: '#dc2626' },
  'Punjab': { zone: 'NORTHERN REGION', code: 'PB', accent: '#d97706' },
  'Haryana': { zone: 'NORTHERN REGION', code: 'HR', accent: '#2563eb' },
  'Rajasthan': { zone: 'NORTHERN REGION', code: 'RJ', accent: '#ea580c' },
  'Bihar': { zone: 'EASTERN REGION', code: 'BR', accent: '#9333ea' },
  'West Bengal': { zone: 'EASTERN REGION', code: 'WB', accent: '#0891b2' },
  'Maharashtra': { zone: 'WESTERN REGION', code: 'MH', accent: '#4f46e5' },
  'Gujarat': { zone: 'WESTERN REGION', code: 'GJ', accent: '#c026d3' }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Document Elements
  const issuerText = document.getElementById('issuer-text');
  const docDate = document.getElementById('doc-date');
  const btnStamp = document.getElementById('btn-stamp');
  const noticeDocument = document.getElementById('notice-document');
  const stampTarget = document.getElementById('stamp-target');
  const actionPanel = document.getElementById('action-panel');
  const btnDownload = document.getElementById('btn-download');
  const btnShare = document.getElementById('btn-share');
  const btnShareAll = document.getElementById('btn-share-all');

  // State Customization Elements
  const stateWatermark = document.getElementById('state-watermark');
  const stateZoneTag = document.getElementById('state-zone-tag');
  const stateEmblemBadge = document.getElementById('state-emblem-badge');
  const stateCodeBadge = document.getElementById('state-code-badge');

  // Leaderboard Elements
  const totalStampsCount = document.getElementById('total-stamps-count');
  const leaderboardList = document.getElementById('leaderboard-list');

  // Custom Searchable Dropdown Elements - STATE
  const stateContainer = document.getElementById('state-dropdown-container');
  const stateTrigger = document.getElementById('state-dropdown-trigger');
  const stateSelectedLabel = document.getElementById('state-selected-label');
  const stateMenu = document.getElementById('state-dropdown-menu');
  const stateSearchInput = document.getElementById('state-search-input');
  const stateList = document.getElementById('state-dropdown-list');

  // Custom Searchable Dropdown Elements - MP
  const mpContainer = document.getElementById('mp-dropdown-container');
  const mpTrigger = document.getElementById('mp-dropdown-trigger');
  const mpSelectedLabel = document.getElementById('mp-selected-label');
  const mpMenu = document.getElementById('mp-dropdown-menu');
  const mpSearchInput = document.getElementById('mp-search-input');
  const mpList = document.getElementById('mp-dropdown-list');

  // MP Card Elements
  const mpInfoCard = document.getElementById('mp-info-card');
  const mpName = document.getElementById('mp-name');
  const mpConstituencyLabel = document.getElementById('mp-constituency-label');
  const mpEmail = document.getElementById('mp-email');
  const emailSubjectPreview = document.getElementById('email-subject-preview');
  const emailBodyPreviewText = document.getElementById('email-body-preview-text');
  const btnSendEmail = document.getElementById('btn-send-email');
  const btnGmailAction = document.getElementById('btn-gmail-action');
  const btnCopyEmail = document.getElementById('btn-copy-email');
  const copyStatusMsg = document.getElementById('copy-status-msg');

  let selectedStateValue = 'Uttar Pradesh';
  let selectedConstituencyValue = '';
  let generatedImageDataUrl = null;
  let currentSubjectText = '';
  let currentBodyText = '';
  let currentMpEmail = '';

  // 1. Set current date dynamically in IST (DD-MM-YYYY)
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dd = String(istNow.getDate()).padStart(2, '0');
  const mm = String(istNow.getMonth() + 1).padStart(2, '0');
  const yyyy = istNow.getFullYear();
  if (docDate) {
    docDate.textContent = `${dd}-${mm}-${yyyy}`;
  }

  // 2. Setup Searchable Custom Dropdown for STATES
  const statesListAll = Object.keys(MP_DATA).sort();

  function renderStateItems(filterQuery = '') {
    if (!stateList) return;
    const query = filterQuery.toLowerCase().trim();
    const filtered = statesListAll.filter(st => st.toLowerCase().includes(query));

    if (filtered.length === 0) {
      stateList.innerHTML = `<li class="dropdown-no-results">No state found matching "${filterQuery}"</li>`;
      return;
    }

    stateList.innerHTML = filtered.map(st => `
      <li class="dropdown-item ${st === selectedStateValue ? 'selected' : ''}" data-value="${st}">
        <span>${st}</span>
      </li>
    `).join('');

    stateList.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const val = item.getAttribute('data-value');
        selectState(val);
        closeStateMenu();
      });
    });
  }

  function toggleStateMenu() {
    const isHidden = stateMenu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
      stateMenu.classList.remove('hidden');
      stateContainer.classList.add('open');
      if (stateSearchInput) {
        stateSearchInput.value = '';
        renderStateItems('');
        stateSearchInput.focus();
      }
    }
  }

  function closeStateMenu() {
    if (stateMenu) stateMenu.classList.add('hidden');
    if (stateContainer) stateContainer.classList.remove('open');
  }

  if (stateTrigger) {
    stateTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStateMenu();
    });
  }

  if (stateSearchInput) {
    stateSearchInput.addEventListener('input', (e) => {
      renderStateItems(e.target.value);
    });
    stateSearchInput.addEventListener('click', (e) => e.stopPropagation());
  }

  function selectState(state) {
    selectedStateValue = state;
    if (stateSelectedLabel) stateSelectedLabel.textContent = state;

    updateStateCustomization(state);
  }

  // 3. Update State Styling & Emblem Customization
  function updateStateCustomization(state) {
    const zoneMeta = STATE_ZONES[state] || {
      zone: 'CITIZEN AUDIT ZONE',
      code: state.substring(0, 2).toUpperCase(),
      accent: '#dc2626'
    };

    if (issuerText) issuerText.textContent = `Issued by a concerned citizen of ${state}`;
    if (stateWatermark) stateWatermark.textContent = `${state.toUpperCase()} // CITIZEN NOTICE`;
    if (stateZoneTag) stateZoneTag.textContent = `${zoneMeta.zone} AUDIT`;
    if (stateEmblemBadge) stateEmblemBadge.textContent = `CODE: ${zoneMeta.code}-STATE-OFFICIAL`;
    if (stateCodeBadge) stateCodeBadge.textContent = zoneMeta.code;

    if (noticeDocument) {
      noticeDocument.style.setProperty('--paper-accent', zoneMeta.accent);
      noticeDocument.setAttribute('data-state', state);
      noticeDocument.setAttribute('data-zone', zoneMeta.zone);
    }

    // Reset and update MP / Constituency list for this state
    selectedConstituencyValue = '';
    if (mpSelectedLabel) mpSelectedLabel.textContent = `-- Select Constituency / MP in ${state} --`;
    if (mpInfoCard) mpInfoCard.classList.add('hidden');

    if (window.adjustNoticeScale) {
      window.adjustNoticeScale();
    }
  }

  // 4. Setup Searchable Custom Dropdown for CONSTITUENCIES / MPs
  function renderMPItems(filterQuery = '') {
    if (!mpList) return;
    const stateMPs = getConstituenciesForState(selectedStateValue);
    const constituencies = Object.keys(stateMPs);
    const query = filterQuery.toLowerCase().trim();

    const filtered = constituencies.filter(c => {
      const mpObj = stateMPs[c];
      return c.toLowerCase().includes(query) || (mpObj && mpObj.mp.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      mpList.innerHTML = `<li class="dropdown-no-results">No constituency or MP found matching "${filterQuery}"</li>`;
      return;
    }

    mpList.innerHTML = filtered.map(c => {
      const mpObj = stateMPs[c];
      return `
        <li class="dropdown-item ${c === selectedConstituencyValue ? 'selected' : ''}" data-value="${c}">
          <span>${c}</span>
          <span class="item-sub">MP: ${mpObj.mp}</span>
        </li>
      `;
    }).join('');

    mpList.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        selectConstituency(val);
        closeMpMenu();
      });
    });
  }

  function toggleMpMenu() {
    const isHidden = mpMenu.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
      mpMenu.classList.remove('hidden');
      mpContainer.classList.add('open');
      if (mpSearchInput) {
        mpSearchInput.value = '';
        renderMPItems('');
        mpSearchInput.focus();
      }
    }
  }

  function closeMpMenu() {
    if (mpMenu) mpMenu.classList.add('hidden');
    if (mpContainer) mpContainer.classList.remove('open');
  }

  if (mpTrigger) {
    mpTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMpMenu();
    });
  }

  if (mpSearchInput) {
    mpSearchInput.addEventListener('input', (e) => {
      renderMPItems(e.target.value);
    });
    mpSearchInput.addEventListener('click', (e) => e.stopPropagation());
  }

  function selectConstituency(constituency) {
    selectedConstituencyValue = constituency;
    const stateMPs = getConstituenciesForState(selectedStateValue);
    const mpData = stateMPs[constituency];

    if (mpData) {
      if (mpSelectedLabel) mpSelectedLabel.textContent = `${constituency} (${mpData.mp})`;
      
      const emailContent = getRandomEmailTemplate(selectedStateValue, constituency, mpData.mp);
      currentSubjectText = emailContent.subject;
      currentBodyText = emailContent.body;
      currentMpEmail = mpData.email;

      if (mpName) mpName.textContent = mpData.mp.startsWith('Shri') || mpData.mp.startsWith('Dr') || mpData.mp.startsWith('Lok') ? mpData.mp : `Shri/Smt. ${mpData.mp}`;
      if (mpConstituencyLabel) mpConstituencyLabel.textContent = `Lok Sabha MP • ${constituency}, ${selectedStateValue}`;
      if (mpEmail) mpEmail.textContent = mpData.email;
      if (emailSubjectPreview) emailSubjectPreview.textContent = emailContent.subject;
      if (emailBodyPreviewText) emailBodyPreviewText.textContent = emailContent.body;

      // Direct Native Mailto Link
      const mailtoUrl = `mailto:${mpData.email}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
      if (btnSendEmail) btnSendEmail.href = mailtoUrl;

      // Direct Gmail Web Compose Link
      const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mpData.email)}&su=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;
      if (btnGmailAction) btnGmailAction.href = gmailWebUrl;

      if (mpInfoCard) mpInfoCard.classList.remove('hidden');
      if (copyStatusMsg) copyStatusMsg.classList.add('hidden');
    }
  }

  function closeAllMenus() {
    closeStateMenu();
    closeMpMenu();
  }

  document.addEventListener('click', () => {
    closeAllMenus();
  });

  // Initialize Default State
  renderStateItems('');
  updateStateCustomization('Uttar Pradesh');

  // 5. Anime.js Heavy Rubber Stamp Slam Animation with Random Placement
  const stampPositions = [
    // Top row
    { top: '15%', left: '25%' },
    { top: '18%', left: '55%' },
    { top: '12%', left: '75%' },
    // Middle row
    { top: '40%', left: '30%' },
    { top: '45%', left: '50%' },
    { top: '42%', left: '70%' },
    // Lower-middle row
    { top: '60%', left: '25%' },
    { top: '55%', left: '55%' },
    { top: '58%', left: '75%' },
    // Bottom row
    { top: '75%', left: '35%' },
    { top: '78%', left: '60%' },
    { top: '72%', left: '50%' },
  ];

  function playStampAnimation() {
    // Pick random position and rotation
    const pos = stampPositions[Math.floor(Math.random() * stampPositions.length)];
    const randomRotation = -25 + Math.random() * 40; // between -25deg and +15deg

    // Reset and set new position
    anime.remove(stampTarget);
    stampTarget.style.top = pos.top;
    stampTarget.style.left = pos.left;
    stampTarget.style.opacity = '0';
    stampTarget.style.transform = `translate(-50%, -50%) scale(4) rotate(${randomRotation}deg)`;

    const finalRotation = randomRotation;

    const tl = anime.timeline({
      easing: 'easeOutQuad'
    });

    tl.add({
      targets: stampTarget,
      opacity: [0, 0.95],
      scale: [4, 0.92],
      rotate: [`${finalRotation}deg`, `${finalRotation}deg`],
      duration: 350,
      easing: 'cubicBezier(0.7, 0, 0.84, 0)'
    })
    .add({
      targets: stampTarget,
      scale: [0.92, 1.05, 1.0],
      duration: 200,
      easing: 'easeOutElastic(1, .5)',
      begin: () => {
        noticeDocument.classList.remove('shake-impact');
        void noticeDocument.offsetWidth;
        noticeDocument.classList.add('shake-impact');
      },
      complete: () => {
        revealActionPanel();
      }
    });
  }

  // 6. High-Res Snapshot Generation
  async function generateHighResSnapshot() {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const scalerContainer = document.querySelector('.notice-scaler-container');
    const scaleWrapper = document.querySelector('.notice-scale-wrapper');
    let originalTransform = '';
    let originalContainerHeight = '';

    if (scaleWrapper && scalerContainer) {
      originalTransform = scaleWrapper.style.transform;
      originalContainerHeight = scalerContainer.style.height;
      scaleWrapper.style.transform = 'none';
      scalerContainer.style.height = 'auto';
    }

    try {
      generatedImageDataUrl = await htmlToImage.toPng(noticeDocument, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
    } catch (err) {
      console.warn('html-to-image fallback to html2canvas scale: 3', err);
      const canvas = await html2canvas(noticeDocument, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      generatedImageDataUrl = canvas.toDataURL('image/png');
    }

    if (scaleWrapper && scalerContainer) {
      scaleWrapper.style.transform = originalTransform;
      scalerContainer.style.height = originalContainerHeight;
    }

    return generatedImageDataUrl;
  }

  async function revealActionPanel() {
    actionPanel.classList.remove('hidden');
    actionPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await generateHighResSnapshot();
  }

  // 7. Event Listeners
  if (btnStamp) {
    btnStamp.addEventListener('click', () => {
      updateStateCustomization(selectedStateValue);
      recordStampClick(selectedStateValue);
      loadLeaderboard();
      playStampAnimation();
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      const cleanState = selectedStateValue.replace(/\s+/g, '_');
      const fileName = `Public_Expulsion_Notice_${cleanState}.png`;

      if (!generatedImageDataUrl) {
        await generateHighResSnapshot();
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = generatedImageDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const tweetText = `I have officially issued a Public Expulsion Notice to Education Minister Shri @dpradhanbjp as a concerned citizen of ${selectedStateValue}. Systemic examination failures cannot be ignored! @PMOIndia`;
      const hashtags = 'NEETLeak2026,EducationJustice';
      const shareUrl = window.location.href;

      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&hashtags=${encodeURIComponent(hashtags)}&url=${encodeURIComponent(shareUrl)}`;

      window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    });
  }

  if (btnShareAll) {
    btnShareAll.addEventListener('click', async () => {
      const shareText = `I have officially issued a Public Expulsion Notice to Education Minister Shri Dharmendra Pradhan as a concerned citizen of ${selectedStateValue}. Systemic examination failures cannot be ignored! #NEETLeak2026`;
      const shareUrl = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'The Public Expulsion Notice',
            text: shareText,
            url: shareUrl
          });
        } catch (err) {
          console.warn('Native share aborted or failed:', err);
        }
      } else {
        // Fallback to WhatsApp Web/App
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // 8. Real-Time Resistance Leaderboard Loader
  async function loadLeaderboard() {
    const res = await fetchLeaderboard();
    if (res.success && leaderboardList) {
      const { totalStamps, leaderboard } = res.data;
      if (totalStampsCount) {
        totalStampsCount.textContent = `${totalStamps.toLocaleString()} TOTAL STAMPS`;
      }

      if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `<div class="loading-placeholder">No stamps recorded yet. Be the first to click STAMP EXPULSION!</div>`;
      } else {
        leaderboardList.innerHTML = leaderboard.slice(0, 5).map((item, index) => `
          <div class="lb-item">
            <div class="lb-info">
              <span class="lb-rank-name">#${index + 1} ${item.state}</span>
              <span class="lb-count">${item.stamps.toLocaleString()} Stamps</span>
            </div>
            <div class="lb-progress-bar">
              <div class="lb-progress-fill" style="width: ${item.percentage}%;"></div>
            </div>
          </div>
        `).join('');
      }
    }
  }

  loadLeaderboard();
  // Auto-refresh leaderboard every 8 seconds for global live sync across all browsers
  setInterval(loadLeaderboard, 8000);

  // 1-Click Copy Fallback Handler
  if (btnCopyEmail) {
    btnCopyEmail.addEventListener('click', async () => {
      const fullText = `TO: ${currentMpEmail}\nSUBJECT: ${currentSubjectText}\n\nBODY:\n${currentBodyText}`;
      try {
        await navigator.clipboard.writeText(fullText);
        if (copyStatusMsg) {
          copyStatusMsg.classList.remove('hidden');
          setTimeout(() => copyStatusMsg.classList.add('hidden'), 3500);
        }
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });
  }

  // 9. Floating "Buy me a Chai" Donation Popup Handler (Matching Meme page)
  const chaiPopup = document.getElementById('chai-popup');
  const btnCloseChaiPopup = document.getElementById('btn-close-chai-popup');
  const btnSupportServer = document.getElementById('btn-support-server');

  const popupDismissed = localStorage.getItem('chai_popup_dismissed');
  if (!popupDismissed && chaiPopup) {
    // Show after 3-second delay on page load
    setTimeout(() => {
      chaiPopup.classList.remove('hidden');
    }, 3000);
  }

  function dismissChaiPopup() {
    if (chaiPopup) chaiPopup.classList.add('hidden');
    localStorage.setItem('chai_popup_dismissed', 'true');
  }

  if (btnCloseChaiPopup) {
    btnCloseChaiPopup.addEventListener('click', dismissChaiPopup);
  }

  if (btnSupportServer) {
    btnSupportServer.addEventListener('click', dismissChaiPopup);
  }

  // 10. Dynamic Mobile Scaler Layout Handler
  const scalerContainer = document.querySelector('.notice-scaler-container');
  const scaleWrapper = document.querySelector('.notice-scale-wrapper');

  function adjustScale() {
    if (!scalerContainer || !scaleWrapper || !noticeDocument) return;
    const containerWidth = scalerContainer.clientWidth;
    const baseWidth = 580;
    const scale = Math.min(1, containerWidth / baseWidth);

    scalerContainer.style.height = 'auto'; // Reset constraint first to allow natural reflow
    scaleWrapper.style.transform = `scale(${scale})`;
    // Adjust height of container to avoid trailing empty white space on mobile
    scalerContainer.style.height = `${noticeDocument.offsetHeight * scale}px`;
  }

  window.addEventListener('resize', adjustScale);
  window.addEventListener('load', adjustScale);
  
  // Expose adjustScale globally/locally for trigger updates
  window.adjustNoticeScale = adjustScale;
  
  // Initial run
  adjustScale();
  setTimeout(adjustScale, 300);
});
