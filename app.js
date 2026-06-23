import { 
  CATEGORIES, 
  STATUSES, 
  BADGES, 
  SAMPLE_ISSUES, 
  LEADERBOARD, 
  PREDICTIONS, 
  MONTHLY_TRENDS, 
  DISTRICT_STATS, 
  AppState 
} from './data.js';

// ============================================================
// Application State Management
// ============================================================
let localIssues = [...SAMPLE_ISSUES];
let localUser = { ...AppState.currentUser };
let activeView = 'dashboard';
let selectedIssue = null;

// Map & Chart instances
let mapInstance = null;
let markersLayer = null;
let activeMapLayer = 'dark';
let activeTileLayerInstance = null;
let trendChartInstance = null;
let categoryChartInstance = null;
let impactChartInstance = null;

// Mock file upload store
let uploadedMockFiles = [];

// ============================================================
// Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRouting();
  initDropdowns();
  updateHeaderWidgets();
  renderDashboard();
  renderFeed();
  renderInsights();
  renderRewards();
  initContacts();
  initImpactDashboard();
  initAgentCrewConsole();
  initFormHandlers();
  initDrawerHandlers();
  initMobileHandlers();
  initSpeechRecognition();
  showToast('Welcome back! UrbanGuard AI agent is active.', 'info');
});

// ============================================================
// Theme Toggle Logic
// ============================================================
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('urbanguard-theme');
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggleBtn.querySelector('i').className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('light-theme');
    themeToggleBtn.querySelector('i').className = 'fa-solid fa-moon';
  }

  themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
      document.body.classList.remove('light-theme');
      themeToggleBtn.querySelector('i').className = 'fa-solid fa-moon';
      localStorage.setItem('urbanguard-theme', 'dark');
      showToast('Futuristic dark mode activated.', 'info');
    } else {
      document.body.classList.add('light-theme');
      themeToggleBtn.querySelector('i').className = 'fa-solid fa-sun';
      localStorage.setItem('urbanguard-theme', 'light');
      showToast('Clean light mode activated.', 'info');
    }
    
    // Rerender dashboard charts to adapt styles
    if (activeView === 'dashboard') {
      renderDashboard();
    }
    // Rerender Google Maps theme dynamically
    if (activeView === 'map' && mapInstance && typeof google !== 'undefined') {
      mapInstance.setOptions({
        styles: isLightTheme() ? [] : getGoogleMapsDarkStyles()
      });
    }
  });
}

function isLightTheme() {
  return document.body.classList.contains('light-theme');
}

// ============================================================
// Routing & Navigation
// ============================================================
function initRouting() {
  const navItems = document.querySelectorAll('.nav-links .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
      
      // Handle mobile sidebar auto-close
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.getElementById('drawer-overlay').classList.remove('active');
      }
    });
  });

  // Brand logo routes to dashboard (home)
  const brandLogo = document.querySelector('.brand');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      switchView('dashboard');
      
      // Handle mobile sidebar auto-close
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.getElementById('drawer-overlay').classList.remove('active');
      }
    });
  }
}

function switchView(viewName) {
  activeView = viewName;
  
  // Auto-close detail drawer if open
  const drawer = document.getElementById('detail-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (drawer && drawer.classList.contains('active')) {
    drawer.classList.remove('active');
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar || !sidebar.classList.contains('active')) {
      overlay.classList.remove('active');
    }
    selectedIssue = null;
  }
  
  // Update sidebar active class
  document.querySelectorAll('.nav-links .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update main views
  document.querySelectorAll('.view-container').forEach(view => {
    if (view.id === `view-${viewName}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update header title
  const titles = {
    'dashboard': 'Dashboard Overview',
    'feed': 'Report Feed',
    'map': 'Live Incident Zone Map',
    'ai-agents': 'AI Agent Collaboration Hub',
    'contacts': 'Emergency Directory & Authorities',
    'impact': 'Civic Impact Dashboard',
    'insights': 'AI Predictive Risk Insights',
    'rewards': 'Rewards & Leaderboards',
    'report-issue': 'Submit Incident Report'
  };
  document.getElementById('current-view-title').innerText = titles[viewName] || 'UrbanGuard';

  // Specific view loaders
  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'feed') {
    renderFeed();
  } else if (viewName === 'map') {
    initLeafletMap();
  } else if (viewName === 'rewards') {
    renderRewards();
  } else if (viewName === 'contacts') {
    renderContacts();
  } else if (viewName === 'impact') {
    renderImpactDashboard();
  }
}

// Mobile sidebar controls
function initMobileHandlers() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('drawer-overlay');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    if (!document.getElementById('detail-drawer').classList.contains('active')) {
      overlay.classList.remove('active');
    }
  });
}

// Populates category select options in filter list & forms
function initDropdowns() {
  const categoryFilter = document.getElementById('filter-category');
  const categoryFormSelect = document.getElementById('issue-category');
  
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categoryFormSelect.innerHTML = '<option value="" disabled selected>Select a category</option>';

  Object.entries(CATEGORIES).forEach(([key, value]) => {
    // Filter dropdown
    const filterOption = document.createElement('option');
    filterOption.value = key;
    filterOption.innerText = value.label;
    categoryFilter.appendChild(filterOption);

    // Form dropdown
    const formOption = document.createElement('option');
    formOption.value = key;
    formOption.innerText = value.label;
    categoryFormSelect.appendChild(formOption);
  });

  // Feed filters action listeners
  categoryFilter.addEventListener('change', renderFeed);
  document.getElementById('filter-status').addEventListener('change', renderFeed);
  document.getElementById('filter-priority').addEventListener('change', renderFeed);
  document.getElementById('feed-search-input').addEventListener('input', renderFeed);
}

// ============================================================
// User Level & XP System
// ============================================================
function awardXP(amount) {
  localUser.totalXp += amount;
  localUser.xp += amount;
  
  let currentLevel = localUser.level;
  let xpNeeded = LEVEL_THRESHOLDS[currentLevel];
  
  let levelUp = false;
  while (localUser.xp >= xpNeeded && currentLevel < LEVEL_THRESHOLDS.length - 1) {
    localUser.xp -= xpNeeded;
    localUser.level++;
    currentLevel = localUser.level;
    xpNeeded = LEVEL_THRESHOLDS[currentLevel];
    levelUp = true;
  }
  
  updateHeaderWidgets();
  
  if (levelUp) {
    showToast(`🎉 Level Up! You reached Level ${localUser.level}!`, 'success');
    // Check if new badges are unlocked by level
    checkLevelBadgeUnlock();
  } else {
    showToast(`+${amount} XP Earned!`, 'success');
  }
}

function checkLevelBadgeUnlock() {
  if (localUser.level >= 10 && !localUser.badges.includes('champion')) {
    unlockBadge('champion');
  }
}

function unlockBadge(badgeId) {
  if (!localUser.badges.includes(badgeId)) {
    localUser.badges.push(badgeId);
    const badge = BADGES.find(b => b.id === badgeId);
    showToast(`🏆 Badge Unlocked: ${badge ? badge.name : badgeId}!`, 'success');
    if (badge) {
      awardXP(badge.xp);
    }
  }
}

function updateHeaderWidgets() {
  const currentLevel = localUser.level;
  const currentXp = localUser.xp;
  const xpNeeded = LEVEL_THRESHOLDS[currentLevel] || 1000;
  const progressPercent = Math.min((currentXp / xpNeeded) * 100, 100);

  // Update sidebar widgets
  document.getElementById('widget-user-level').innerText = `Level ${currentLevel}`;
  document.getElementById('widget-user-xp').innerText = `${currentXp} / ${xpNeeded} XP`;
  document.getElementById('widget-user-xp-bar').style.width = `${progressPercent}%`;
  document.getElementById('widget-user-name').innerText = localUser.name;
  document.getElementById('widget-user-avatar').innerText = localUser.avatar;

  // Sync metrics on dashboard
  document.getElementById('metric-user-streak').innerText = `${localUser.currentStreak} Days`;
  document.getElementById('metric-user-verifications').innerText = localUser.issuesVerified;
}

// ============================================================
// Dashboard View
// ============================================================
function renderDashboard() {
  // 1. Set Counter Metrics
  document.getElementById('metric-total-issues').innerText = localIssues.length;
  
  const resolvedCount = localIssues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const ratePercent = localIssues.length > 0 ? Math.round((resolvedCount / localIssues.length) * 100) : 0;
  document.getElementById('metric-resolution-rate').innerText = `${ratePercent}%`;

  // 2. Render District Stats
  const districtList = document.getElementById('dashboard-district-list');
  districtList.innerHTML = '';
  
  DISTRICT_STATS.forEach(district => {
    // Count active issues in this district
    const count = localIssues.filter(i => {
      const addr = (i.location.address || '').toLowerCase();
      return addr.includes(district.name.toLowerCase());
    }).length;

    const div = document.createElement('div');
    div.className = 'district-item';
    div.innerHTML = `
      <span class="district-name">${district.name}</span>
      <div class="district-count">
        <span class="badge-count">${count} active</span>
        <span class="badge-count success">${district.resolved} resolved</span>
      </div>
    `;
    districtList.appendChild(div);
  });

  // 3. Render Critical & Active Issues list
  const criticalList = document.getElementById('dashboard-critical-list');
  criticalList.innerHTML = '';
  
  const activeCriticalIssues = localIssues
    .filter(i => (i.priority === 'critical' || i.priority === 'high') && i.status !== 'resolved' && i.status !== 'closed')
    .sort((a, b) => b.upvotes - a.upvotes);

  if (activeCriticalIssues.length === 0) {
    criticalList.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No critical active hazards reported.</div>';
  } else {
    activeCriticalIssues.slice(0, 5).forEach(issue => {
      const item = document.createElement('div');
      item.className = 'district-item';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <span class="district-name" style="font-weight: 600;">
          <i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger); margin-right: 6px;"></i>
          ${issue.title}
        </span>
        <span class="priority-badge ${issue.priority}">${issue.priority}</span>
      `;
      item.addEventListener('click', () => openIssueDetails(issue.id));
      criticalList.appendChild(item);
    });
  }

  // 4. Render Charts
  renderCharts();
}

function renderCharts() {
  const trendCtx = document.getElementById('trendChart').getContext('2d');
  const catCtx = document.getElementById('categoryChart').getContext('2d');

  // Destroy previous instances to prevent overlaps on redraw
  if (trendChartInstance) trendChartInstance.destroy();
  if (categoryChartInstance) categoryChartInstance.destroy();

  // Dynamic colors depending on the active theme
  const isLight = isLightTheme();
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const labelColor = isLight ? '#475569' : '#94a3b8';

  // Monthly trend chart
  trendChartInstance = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: MONTHLY_TRENDS.labels,
      datasets: [
        {
          label: 'Reported Incidents',
          data: MONTHLY_TRENDS.reported,
          borderColor: '#007aff',
          backgroundColor: 'rgba(0, 122, 255, 0.05)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Resolved Incidents',
          data: MONTHLY_TRENDS.resolved,
          borderColor: '#34c759',
          backgroundColor: 'rgba(52, 199, 89, 0.05)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: labelColor, font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' } } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor } }
      }
    }
  });

  // Calculate category frequencies dynamically
  const categoriesCount = {};
  Object.keys(CATEGORIES).forEach(k => { categoriesCount[k] = 0; });
  localIssues.forEach(issue => {
    if (categoriesCount[issue.category] !== undefined) {
      categoriesCount[issue.category]++;
    }
  });

  const categoryLabels = [];
  const categoryData = [];
  const categoryColors = [];

  Object.entries(categoriesCount).forEach(([key, count]) => {
    if (count > 0) {
      categoryLabels.push(CATEGORIES[key].label);
      categoryData.push(count);
      categoryColors.push(CATEGORIES[key].color);
    }
  });

  // Category Doughnut Chart
  categoryChartInstance = new Chart(catCtx, {
    type: 'doughnut',
    data: {
      labels: categoryLabels,
      datasets: [{
        data: categoryData,
        backgroundColor: categoryColors,
        borderWidth: 1,
        borderColor: isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 21, 36, 0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: labelColor, font: { family: 'Inter', size: 10 } }
        }
      }
    }
  });
}

// ============================================================
// Feed View
// ============================================================
function renderFeed() {
  const grid = document.getElementById('feed-issues-grid');
  grid.innerHTML = '';

  const searchVal = document.getElementById('feed-search-input').value.toLowerCase();
  const selectedCat = document.getElementById('filter-category').value;
  const selectedStat = document.getElementById('filter-status').value;
  const selectedPriority = document.getElementById('filter-priority').value;

  // Filter issues
  const filtered = localIssues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchVal) ||
      issue.description.toLowerCase().includes(searchVal) ||
      (issue.location.address || '').toLowerCase().includes(searchVal) ||
      issue.id.toLowerCase().includes(searchVal);
      
    const matchesCategory = selectedCat === 'all' || issue.category === selectedCat;
    const matchesStatus = selectedStat === 'all' || issue.status === selectedStat;
    const matchesPriority = selectedPriority === 'all' || issue.priority === selectedPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-muted); padding: 40px;">No incidents matching the filter settings found.</div>';
    return;
  }

  // Render cards
  filtered.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'issue-card';
    card.addEventListener('click', () => openIssueDetails(issue.id));

    const catInfo = CATEGORIES[issue.category] || { label: issue.category, icon: 'fa-triangle-exclamation', color: '#6b7280' };
    const statInfo = STATUSES[issue.status] || { label: issue.status, color: '#6b7280', icon: 'fa-flag' };

    card.innerHTML = `
      <div>
        <div class="issue-card-header">
          <span class="category-tag" style="background-color: ${catInfo.color}15; color: ${catInfo.color}">
            <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
          </span>
          <span class="priority-badge ${issue.priority}">${issue.priority}</span>
        </div>
        <h4>${issue.title}</h4>
        <p class="issue-desc">${issue.description}</p>
      </div>
      <div>
        <div class="issue-loc">
          <i class="fa-solid fa-location-dot"></i>
          <span>${issue.location.address}</span>
        </div>
        <div class="issue-card-footer">
          <span class="status-badge" style="color: ${statInfo.color}">
            <i class="fa-solid ${statInfo.icon}"></i> ${statInfo.label}
          </span>
          <div class="issue-stats">
            <span><i class="fa-regular fa-thumbs-up"></i> ${issue.upvotes}</span>
            <span><i class="fa-regular fa-circle-check"></i> ${issue.verifications}</span>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ============================================================
// Interactive Leaflet Map
// ============================================================
let googleMarkersList = [];

function getGoogleMapsDarkStyles() {
  return [
    { elementType: "geometry", stylers: [{ color: "#0e1224" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0e1224" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8e8e93" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3a3a3c" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#191f38" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2c385e" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8e8e93" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#001a35" }] }
  ];
}

function initLeafletMap() {
  const container = document.getElementById('map-container');
  if (container.offsetWidth === 0) return;

  if (mapInstance) {
    plotMapMarkers();
    return;
  }

  // Safe guard: check if Google Maps JS script loaded successfully
  if (typeof google === 'undefined' || !google.maps) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; color: var(--text-secondary); background: rgba(14, 18, 36, 0.4); border: 1px solid var(--card-border); border-radius: var(--border-radius-lg);">
        <i class="fa-solid fa-map-location-dot" style="font-size: 40px; color: var(--color-danger); margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(255, 59, 48, 0.4));"></i>
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Google Maps API Not Loaded</h3>
        <p style="font-size: 13px; color: var(--text-muted); max-width: 400px; line-height: 1.4;">
          The Google Maps library is not available. Please verify your internet connection or check your adblocker settings. The rest of the platform features remain active.
        </p>
      </div>
    `;
    console.warn("Google Maps JS API is not defined. Skipping map initialization.");
    return;
  }

  const bangalore = { lat: 12.9716, lng: 77.5946 };
  
  // Initialize Google Map
  mapInstance = new google.maps.Map(container, {
    zoom: 12,
    center: bangalore,
    styles: activeMapLayer === 'dark' ? getGoogleMapsDarkStyles() : [],
    mapTypeId: activeMapLayer === 'satellite' ? 'satellite' : 'roadmap',
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP
    }
  });

  // Wire Map Control Toggles
  const layerButtons = document.querySelectorAll('.layer-btn');
  layerButtons.forEach(btn => {
    // Sync initial active state
    if (btn.getAttribute('data-layer') === activeMapLayer) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetLayer = btn.getAttribute('data-layer');
      activeMapLayer = targetLayer;
      
      layerButtons.forEach(b => {
        if (b.getAttribute('data-layer') === activeMapLayer) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      if (activeMapLayer === 'satellite') {
        mapInstance.setMapTypeId('satellite');
      } else {
        mapInstance.setMapTypeId('roadmap');
        mapInstance.setOptions({
          styles: activeMapLayer === 'dark' ? getGoogleMapsDarkStyles() : []
        });
      }
    });
  });

  plotMapMarkers();
}

function plotMapMarkers() {
  if (!mapInstance) return;

  // Clear existing markers
  googleMarkersList.forEach(m => m.setMap(null));
  googleMarkersList = [];

  localIssues.forEach(issue => {
    const lat = issue.location.lat;
    const lng = issue.location.lng;
    if (!lat || !lng) return;

    const catColor = CATEGORIES[issue.category]?.color || '#3b82f6';
    const statusLabel = STATUSES[issue.status]?.label || issue.status;

    const markerIcon = {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: catColor,
      fillOpacity: 0.9,
      strokeWeight: 1.5,
      strokeColor: '#ffffff',
      scale: 1.5,
      anchor: new google.maps.Point(12, 22)
    };

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      icon: markerIcon,
      title: issue.title
    });

    const popupContent = `
      <div class="map-popup-content">
        <h4 style="color: var(--text-primary); font-weight: 700; margin-bottom: 6px;">${issue.title}</h4>
        <p style="color: var(--text-secondary); font-size:12px;"><strong>Status:</strong> ${statusLabel}<br><strong>Address:</strong> ${issue.location.address}</p>
        <button class="map-popup-btn" id="popup-btn-${issue.id}">View Details</button>
      </div>
    `;

    const infowindow = new google.maps.InfoWindow({
      content: popupContent
    });

    marker.addListener("click", () => {
      infowindow.open(mapInstance, marker);
    });

    google.maps.event.addListener(infowindow, 'domready', () => {
      const btn = document.getElementById(`popup-btn-${issue.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          openIssueDetails(issue.id);
          infowindow.close();
        });
      }
    });

    googleMarkersList.push(marker);
  });
}

// ============================================================
// Predictive Insights View
// ============================================================
function renderInsights() {
  const container = document.getElementById('predictions-cards-grid');
  container.innerHTML = '';

  PREDICTIONS.forEach(pred => {
    const card = document.createElement('div');
    const riskClass = pred.severity === 'high' ? 'high-risk' : 'medium-risk';
    card.className = `prediction-card ${riskClass}`;

    const catInfo = CATEGORIES[pred.category] || { label: pred.category, icon: 'fa-triangle-exclamation', color: '#6b7280' };

    card.innerHTML = `
      <div class="prediction-header">
        <span class="prediction-tag ${pred.severity}">
          <i class="fa-solid fa-triangle-exclamation"></i> ${pred.severity.toUpperCase()} RISK
        </span>
        <div class="prediction-conf">
          AI Confidence: <span>${Math.round(pred.confidence * 100)}%</span>
        </div>
      </div>
      <span class="category-tag" style="background-color: ${catInfo.color}15; color: ${catInfo.color}; width: fit-content; margin-bottom: 12px;">
        <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
      </span>
      <h3>${pred.title}</h3>
      <p>${pred.description}</p>
      
      <div class="prediction-areas">
        <span class="prediction-areas-title">Affected Areas</span>
        <div class="areas-list">
          ${pred.areas.map(area => `<span class="area-tag">${area}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// Rewards & Leaderboards View
// ============================================================
function renderRewards() {
  // Sync profile values
  document.getElementById('rewards-user-name').innerText = localUser.name;
  document.getElementById('rewards-user-avatar').innerText = localUser.avatar;
  document.getElementById('rewards-user-streak').innerText = `${localUser.currentStreak} Days`;
  document.getElementById('rewards-user-verified').innerText = `${localUser.issuesVerified} Issues`;

  const currentLevel = localUser.level;
  const currentXp = localUser.xp;
  const xpNeeded = LEVEL_THRESHOLDS[currentLevel];
  const progressPercent = Math.min((currentXp / xpNeeded) * 100, 100);

  document.getElementById('rewards-user-level').innerText = `Level ${currentLevel}`;
  document.getElementById('rewards-user-xp').innerText = `${currentXp} / ${xpNeeded} XP`;
  document.getElementById('rewards-user-xp-bar').style.width = `${progressPercent}%`;

  // Render Badges Gallery
  const badgesGrid = document.getElementById('rewards-badges-grid');
  badgesGrid.innerHTML = '';

  BADGES.forEach(badge => {
    const isUnlocked = localUser.badges.includes(badge.id);
    const div = document.createElement('div');
    div.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
    div.setAttribute('data-tooltip', `${badge.name}: ${badge.desc} (+${badge.xp} XP)`);
    div.innerHTML = `<i class="fa-solid ${badge.icon}"></i>`;
    
    if (!isUnlocked) {
      div.addEventListener('click', () => {
        unlockBadge(badge.id);
        renderRewards();
      });
    }
    badgesGrid.appendChild(div);
  });

  // Render Leaderboard
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '';

  let sortedLeaderboard = [...LEADERBOARD];
  const userRankIdx = sortedLeaderboard.findIndex(l => l.name === localUser.name || l.name === 'You');
  
  if (userRankIdx !== -1) {
    sortedLeaderboard[userRankIdx] = {
      rank: 1,
      name: `${localUser.name} (You)`,
      avatar: localUser.avatar,
      level: localUser.level,
      xp: localUser.totalXp,
      issues: localUser.issuesReported,
      verifications: localUser.issuesVerified,
      badges: localUser.badges.length
    };
  } else {
    sortedLeaderboard.push({
      name: `${localUser.name} (You)`,
      avatar: localUser.avatar,
      level: localUser.level,
      xp: localUser.totalXp,
      issues: localUser.issuesReported,
      verifications: localUser.issuesVerified,
      badges: localUser.badges.length
    });
  }

  // Sort by cumulative XP
  sortedLeaderboard.sort((a, b) => b.xp - a.xp);
  
  sortedLeaderboard.forEach((player, index) => {
    const rank = index + 1;
    const isCurrentUser = player.name.includes('(You)');
    const tr = document.createElement('tr');
    if (isCurrentUser) {
      tr.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
      tr.style.fontWeight = '600';
    }

    const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';

    tr.innerHTML = `
      <td class="rank-cell ${rankClass}">${rank}</td>
      <td>
        <div class="user-cell">
          <div class="user-avatar" style="${isCurrentUser ? 'background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); border: none;' : ''}">
            ${player.avatar}
          </div>
          <span>${player.name}</span>
        </div>
      </td>
      <td><span class="table-level-badge">Lvl ${player.level}</span></td>
      <td style="font-family: 'Outfit'; font-weight: 600;">${player.xp}</td>
      <td>${player.issues}</td>
      <td>${player.verifications}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// Submit Issue Form & PostalPinCode API Integration
// ============================================================
function initFormHandlers() {
  const form = document.getElementById('submit-issue-form');
  const verifyPincodeBtn = document.getElementById('btn-verify-pincode');
  const pincodeLoader = document.getElementById('pincode-loader-text');
  const areaSelect = document.getElementById('pincode-area-select');
  const uploadTrigger = document.getElementById('simulated-upload-trigger');
  const previewGrid = document.getElementById('upload-preview-grid');

  // 1. Postal Pincode API validation
  verifyPincodeBtn.addEventListener('click', async () => {
    const pincode = document.getElementById('issue-pincode').value.trim();
    if (!/^\d{6}$/.test(pincode)) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'warning');
      return;
    }

    pincodeLoader.style.display = 'block';
    areaSelect.style.display = 'none';
    verifyPincodeBtn.disabled = true;

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      pincodeLoader.style.display = 'none';
      verifyPincodeBtn.disabled = false;

      if (data[0] && data[0].Status === 'Success') {
        const postOffices = data[0].PostOffice;
        areaSelect.innerHTML = '<option value="" disabled selected>Select your area...</option>';
        
        postOffices.forEach(po => {
          const opt = document.createElement('option');
          opt.value = po.Name;
          opt.innerText = `${po.Name} (Block: ${po.Block || 'NA'}, Dist: ${po.District})`;
          opt.setAttribute('data-district', po.District);
          opt.setAttribute('data-state', po.State);
          areaSelect.appendChild(opt);
        });
        
        areaSelect.style.display = 'block';
        showToast(`Pincode verified! ${postOffices.length} areas found.`, 'success');
      } else {
        showToast('No post office records found for this pincode. Try another.', 'warning');
      }
    } catch (error) {
      console.error(error);
      pincodeLoader.style.display = 'none';
      verifyPincodeBtn.disabled = false;
      showToast('Network error querying Pincode API. Please fill address manually.', 'warning');
    }
  });

  // Handle Pincode Area Option Selection
  areaSelect.addEventListener('change', () => {
    const selectedOption = areaSelect.options[areaSelect.selectedIndex];
    const postOfficeName = selectedOption.value;
    const district = selectedOption.getAttribute('data-district');
    const pincode = document.getElementById('issue-pincode').value.trim();
    
    // Auto-fill address
    document.getElementById('issue-address').value = `${postOfficeName}, ${district}, Karnataka - ${pincode}`;
    
    showToast(`Autofilled location to ${postOfficeName}!`, 'info');
  });

  // 2. Simulated Media Upload
  uploadTrigger.addEventListener('click', () => {
    const mockImages = ['pothole_mg_road.jpg', 'water_burst_kora.jpg', 'electric_whitefield.jpg'];
    const chosenImage = mockImages[Math.floor(Math.random() * mockImages.length)];
    const mockFileId = `file-${Date.now()}`;

    uploadedMockFiles.push({ id: mockFileId, path: chosenImage });
    previewGrid.style.display = 'grid';

    const thumb = document.createElement('div');
    thumb.className = 'uploaded-thumb';
    thumb.id = mockFileId;
    thumb.innerHTML = `
      <img src="./images/${chosenImage}" onerror="this.src='https://images.unsplash.com/photo-1594818821905-18151240cc24?auto=format&fit=crop&q=80&w=200'" alt="Preview">
      <button type="button" class="remove-mock-file"><i class="fa-solid fa-xmark"></i></button>
    `;

    thumb.querySelector('.remove-mock-file').addEventListener('click', () => {
      uploadedMockFiles = uploadedMockFiles.filter(f => f.id !== mockFileId);
      thumb.remove();
      if (uploadedMockFiles.length === 0) {
        previewGrid.style.display = 'none';
      }
    });

    previewGrid.appendChild(thumb);
    showToast('Mock image attached successfully.', 'info');
    analyzeAttachedImage(chosenImage);
  });

  // 3. Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('issue-title').value.trim();
    const description = document.getElementById('issue-description').value.trim();
    const category = document.getElementById('issue-category').value;
    const priority = document.getElementById('issue-priority').value;
    const address = document.getElementById('issue-address').value.trim();

    const bangaloreCenterLat = 12.9716;
    const bangaloreCenterLng = 77.5946;
    const randomOffsetLat = (Math.random() - 0.5) * 0.08;
    const randomOffsetLng = (Math.random() - 0.5) * 0.08;

    const newIssueId = `UG-${1000 + localIssues.length + 1}`;

    const newIssue = {
      id: newIssueId,
      title,
      category,
      status: 'reported',
      description,
      location: {
        lat: bangaloreCenterLat + randomOffsetLat,
        lng: bangaloreCenterLng + randomOffsetLng,
        address
      },
      reportedBy: { name: localUser.name, avatar: localUser.avatar, level: localUser.level },
      reportedAt: new Date().toISOString(),
      upvotes: 1,
      verifications: 0,
      images: uploadedMockFiles.map(f => f.path),
      priority,
      timeline: [
        { status: 'reported', at: new Date().toISOString(), by: localUser.name }
      ],
      comments: []
    };

    localIssues.unshift(newIssue);
    localUser.issuesReported++;

    form.reset();
    areaSelect.style.display = 'none';
    previewGrid.innerHTML = '';
    previewGrid.style.display = 'none';
    uploadedMockFiles = [];

    awardXP(100);
    checkReporterBadgeUnlock();
    switchView('feed');
    showToast(`Incident ${newIssueId} submitted successfully.`, 'success');
  });
}

function checkReporterBadgeUnlock() {
  if (localUser.issuesReported >= 25) {
    unlockBadge('reporter_25');
  } else if (localUser.issuesReported >= 5) {
    unlockBadge('reporter_5');
  } else if (localUser.issuesReported >= 1) {
    unlockBadge('first_report');
  }
}

// ============================================================
// Detail Drawer View & Comments
// ============================================================
function initDrawerHandlers() {
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('detail-drawer');
  const closeBtn = document.getElementById('drawer-close-btn');

  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    selectedIssue = null;
  };

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
}

function openIssueDetails(issueId) {
  const issue = localIssues.find(i => i.id === issueId);
  if (!issue) return;

  selectedIssue = issue;
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('detail-drawer');
  const body = document.getElementById('drawer-body');

  // Re-bind top-right close cross button and overlay to guarantee close actions always work
  const closeBtn = document.getElementById('drawer-close-btn');
  const closeDrawer = () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    selectedIssue = null;
  };
  if (closeBtn) {
    closeBtn.onclick = closeDrawer;
  }
  overlay.onclick = closeDrawer;

  const catInfo = CATEGORIES[issue.category] || { label: issue.category, icon: 'fa-triangle-exclamation', color: '#6b7280' };
  const statInfo = STATUSES[issue.status] || { label: issue.status, color: '#6b7280', icon: 'fa-flag' };

  body.innerHTML = `
    <div class="drawer-issue-title">${issue.title}</div>
    
    <div class="drawer-tags">
      <span class="category-tag" style="background-color: ${catInfo.color}15; color: ${catInfo.color}">
        <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
      </span>
      <span class="priority-badge ${issue.priority}">${issue.priority}</span>
    </div>

    <div style="width:100%; aspect-ratio: 16/9; border-radius: var(--border-radius-md); overflow:hidden; background-color: var(--bg-tertiary); border: 1px solid var(--card-border);">
      <img src="https://images.unsplash.com/photo-1594818821905-18151240cc24?auto=format&fit=crop&q=80&w=600" 
           onerror="this.src='https://images.unsplash.com/photo-1594818821905-18151240cc24?auto=format&fit=crop&q=80&w=600'"
           alt="Incident visual representation" style="width:100%; height:100%; object-fit:cover;">
    </div>

    <div class="drawer-description">${issue.description}</div>

    <div class="drawer-meta-section">
      <div class="drawer-meta-row">
        <span class="drawer-meta-label">Location Address</span>
        <span class="drawer-meta-value">${issue.location.address}</span>
      </div>
      <div class="drawer-meta-row">
        <span class="drawer-meta-label">Coordinates</span>
        <span class="drawer-meta-value">${issue.location.lat.toFixed(5)}, ${issue.location.lng.toFixed(5)}</span>
      </div>
      <div class="drawer-meta-row">
        <span class="drawer-meta-label">Reporter</span>
        <span class="drawer-meta-value">${issue.reportedBy.name} (Lvl ${issue.reportedBy.level})</span>
      </div>
      <div class="drawer-meta-row">
        <span class="drawer-meta-label">Reported Date</span>
        <span class="drawer-meta-value">${new Date(issue.reportedAt).toLocaleDateString()}</span>
      </div>
    </div>

    <!-- Timeline Progress -->
    <div class="drawer-section-title">Timeline History</div>
    <div class="timeline">
      ${issue.timeline.map((node, index) => `
        <div class="timeline-node ${index === 0 ? 'active' : ''}">
          <div class="timeline-node-title">${STATUSES[node.status]?.label || node.status}</div>
          <div class="timeline-node-time">${new Date(node.at).toLocaleString()} — by ${node.by}</div>
        </div>
      `).join('')}
    </div>

    <!-- Community Action buttons -->
    <div class="drawer-actions-row">
      <button class="btn-action" id="drawer-btn-upvote">
        <i class="fa-regular fa-thumbs-up"></i> 
        <span>Upvote Issue (${issue.upvotes})</span>
      </button>
      <button class="btn-action" id="drawer-btn-verify">
        <i class="fa-regular fa-circle-check"></i> 
        <span>Verify Location (${issue.verifications})</span>
      </button>
    </div>

    <!-- Discussion Comments -->
    <div class="drawer-section-title">Discussion Feed</div>
    <div class="comments-container" id="drawer-comments-box">
      <!-- Comment items rendered here -->
    </div>
    
    <div class="comment-input-box" style="margin-bottom: 20px;">
      <input type="text" id="drawer-comment-input" placeholder="Ask a question or add details...">
      <button class="btn-send" id="drawer-btn-comment-send">Post</button>
    </div>
    
    <div style="border-top: 1px solid var(--card-border); padding-top: 16px; margin-top: 16px;">
      <button class="btn-action" id="drawer-btn-back" style="background-color: var(--bg-tertiary); border-color: var(--card-border); width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fa-solid fa-chevron-left"></i> Go Back
      </button>
    </div>
  `;

  const upvoteBtn = document.getElementById('drawer-btn-upvote');
  const verifyBtn = document.getElementById('drawer-btn-verify');
  const sendCommentBtn = document.getElementById('drawer-btn-comment-send');
  const commentInput = document.getElementById('drawer-comment-input');
  const backBtn = document.getElementById('drawer-btn-back');

  backBtn.addEventListener('click', () => {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    selectedIssue = null;
  });

  upvoteBtn.addEventListener('click', () => {
    if (upvoteBtn.classList.contains('active')) {
      issue.upvotes--;
      upvoteBtn.classList.remove('active');
    } else {
      issue.upvotes++;
      upvoteBtn.classList.add('active');
      awardXP(10);
    }
    upvoteBtn.querySelector('span').innerText = `Upvote Issue (${issue.upvotes})`;
    renderFeed();
  });

  verifyBtn.addEventListener('click', () => {
    if (verifyBtn.classList.contains('active')) {
      issue.verifications--;
      verifyBtn.classList.remove('active');
      localUser.issuesVerified--;
    } else {
      issue.verifications++;
      verifyBtn.classList.add('active');
      localUser.issuesVerified++;
      awardXP(25);
      checkVerifierBadgeUnlock();
    }
    verifyBtn.querySelector('span').innerText = `Verify Location (${issue.verifications})`;
    renderFeed();
    updateHeaderWidgets();
  });

  const renderCommentsList = () => {
    const box = document.getElementById('drawer-comments-box');
    box.innerHTML = '';
    
    if (issue.comments.length === 0) {
      box.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 10px;">No comments posted yet.</div>';
      return;
    }

    issue.comments.forEach(comment => {
      const node = document.createElement('div');
      node.className = 'comment-node';
      node.innerHTML = `
        <div class="comment-author-row">
          <span class="comment-author">${comment.user}</span>
          <span class="comment-time">${new Date(comment.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="comment-text">${comment.text}</div>
      `;
      box.appendChild(node);
    });
  };

  renderCommentsList();

  sendCommentBtn.addEventListener('click', () => {
    const text = commentInput.value.trim();
    if (!text) return;

    issue.comments.push({
      user: localUser.name,
      text,
      at: new Date().toISOString()
    });

    commentInput.value = '';
    renderCommentsList();
    awardXP(5);
    showToast('Comment posted! +5 XP', 'info');
  });

  overlay.classList.add('active');
  drawer.classList.add('active');
}

function checkVerifierBadgeUnlock() {
  if (localUser.issuesVerified >= 20) {
    unlockBadge('verifier_20');
  } else if (localUser.issuesVerified >= 5) {
    unlockBadge('verifier_5');
  }
}

// ============================================================
// Toast Notification Engine
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-info';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeIn var(--transition-fast) reverse forwards';
    setTimeout(() => { toast.remove(); }, 300);
  }, 4000);
}


// ============================================================
// Contacts Directory & Authorities Data
// ============================================================
const localContacts = [
  {
    sector: 'Koramangala',
    contacts: [
      { type: 'police', title: 'Koramangala Police Station', name: 'Inspector Satish Kumar', phone: '080-22942583', email: 'koramangala.ps@ksp.gov.in' },
      { type: 'hospital', title: 'St. John\'s Medical College Hospital', name: 'Emergency Dept', phone: '080-22065000', email: 'info@stjohns.in' },
      { type: 'officer', title: 'BBMP Koramangala Ward Officer', name: 'Muralidhar R.', phone: '9480685324', email: 'ward151.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'Ramalinga Reddy', phone: '9845012345', email: 'ramalinga.mla@karnataka.gov.in' }
    ]
  },
  {
    sector: 'HSR Layout',
    contacts: [
      { type: 'police', title: 'HSR Layout Police Station', name: 'Inspector Ajay Prasad', phone: '080-22943468', email: 'hsrlayout.ps@ksp.gov.in' },
      { type: 'hospital', title: 'Narayana Multispeciality Hospital', name: 'Emergency Room', phone: '080-71112345', email: 'emergency.hsr@narayanahealth.org' },
      { type: 'officer', title: 'BBMP HSR Layout Ward Officer', name: 'Geetha V.', phone: '9480683215', email: 'ward174.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'Satish Reddy', phone: '9880098765', email: 'satishreddy.mla@karnataka.gov.in' }
    ]
  },
  {
    sector: 'MG Road',
    contacts: [
      { type: 'police', title: 'Ulsoor Gate Police Station', name: 'Inspector K. P. Ramesh', phone: '080-22942289', email: 'ulsoorgate.ps@ksp.gov.in' },
      { type: 'hospital', title: 'Bowring & Lady Curzon Hospital', name: 'Casualty Unit', phone: '080-25591325', email: 'bowringhospital@karnataka.gov.in' },
      { type: 'officer', title: 'BBMP Central Zone Ward Officer', name: 'Sanjay Kumar', phone: '9480681122', email: 'central.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'N. A. Haris', phone: '9844033445', email: 'naharis.mla@karnataka.gov.in' }
    ]
  },
  {
    sector: 'Indiranagar',
    contacts: [
      { type: 'police', title: 'Indiranagar Police Station', name: 'Inspector Lokesh Gowda', phone: '080-22942514', email: 'indiranagar.ps@ksp.gov.in' },
      { type: 'hospital', title: 'Chinmaya Mission Hospital (CMH)', name: 'Emergency Line', phone: '080-25280455', email: 'info@cmh.org' },
      { type: 'officer', title: 'BBMP Indiranagar Ward Officer', name: 'Kiran Gowda', phone: '9480682245', email: 'ward80.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'S. Raghu', phone: '9845055667', email: 'sraghu.mla@karnataka.gov.in' }
    ]
  },
  {
    sector: 'Jayanagar',
    contacts: [
      { type: 'police', title: 'Jayanagar Police Station', name: 'Inspector Manjunath N.', phone: '080-22942584', email: 'jayanagar.ps@ksp.gov.in' },
      { type: 'hospital', title: 'Sagar Hospitals Jayanagar', name: 'Trauma & Emergency', phone: '080-42888888', email: 'emergency.jayanagar@sagarhospitals.in' },
      { type: 'officer', title: 'BBMP Jayanagar Ward Officer', name: 'Bharathi S.', phone: '9480684511', email: 'ward169.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'C. K. Ramamurthy', phone: '9844077889', email: 'ckr.mla@karnataka.gov.in' }
    ]
  },
  {
    sector: 'Hebbal',
    contacts: [
      { type: 'police', title: 'Hebbal Police Station', name: 'Inspector Raghavendra', phone: '080-22942588', email: 'hebbal.ps@ksp.gov.in' },
      { type: 'hospital', title: 'Columbia Asia Hospital Hebbal', name: '24/7 ER', phone: '080-41791000', email: 'hebbal.info@manipalhospitals.com' },
      { type: 'officer', title: 'BBMP Hebbal Ward Officer', name: 'Naveen Raj', phone: '9480685514', email: 'ward22.officer@bbmp.gov.in' },
      { type: 'rep', title: 'Local MLA / Corporator', name: 'Byrathi Suresh', phone: '9845022114', email: 'byrathisuresh.mla@karnataka.gov.in' }
    ]
  }
];

function initContacts() {
  const filter = document.getElementById('contacts-sector-filter');
  filter.addEventListener('change', renderContacts);
  renderContacts();
}

function renderContacts() {
  const grid = document.getElementById('contacts-cards-grid');
  const selectedSector = document.getElementById('contacts-sector-filter').value;
  grid.innerHTML = '';

  const matched = selectedSector === 'all' 
    ? localContacts 
    : localContacts.filter(c => c.sector === selectedSector);

  matched.forEach(sectorGroup => {
    sectorGroup.contacts.forEach(contact => {
      const card = document.createElement('div');
      card.className = `contact-card ${contact.type}`;
      
      const typeIcons = {
        police: 'fa-building-shield',
        hospital: 'fa-hospital',
        officer: 'fa-user-tie',
        rep: 'fa-landmark'
      };

      card.innerHTML = `
        <div class="contact-card-header">
          <div class="contact-card-icon">
            <i class="fa-solid ${typeIcons[contact.type]}"></i>
          </div>
          <div class="contact-card-title">
            <h4>${contact.title}</h4>
            <span>Sector: ${sectorGroup.sector}</span>
          </div>
        </div>
        <div class="contact-details-list">
          <div class="contact-detail-item">
            <i class="fa-solid fa-user"></i>
            <span>${contact.name}</span>
          </div>
          <div class="contact-detail-item">
            <i class="fa-solid fa-phone"></i>
            <span>${contact.phone}</span>
          </div>
          <div class="contact-detail-item">
            <i class="fa-solid fa-envelope"></i>
            <span>${contact.email}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  });
}

// ============================================================
// Impact Dashboard Logic
// ============================================================
function initImpactDashboard() {
  // Stats counters automatically loaded via HTML template
}

function renderImpactDashboard() {
  const ctx = document.getElementById('impactChart').getContext('2d');
  
  if (impactChartInstance) {
    impactChartInstance.destroy();
  }

  const isLight = isLightTheme();
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const labelColor = isLight ? '#475569' : '#94a3b8';

  // SLA Resolution Times per category
  impactChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Electricity', 'Water Supply', 'Sanitation', 'Potholes / Road Damage', 'Drainage / Flooding', 'Tree Hazards'],
      datasets: [
        {
          label: 'Average SLA Response (Hours)',
          data: [4.2, 5.8, 11.5, 48.0, 24.5, 12.0],
          backgroundColor: [
            '#ff9500', // Orange
            '#007aff', // Blue
            '#af52de', // Purple
            '#ff3b30', // Red
            '#5856d6', // Indigo
            '#34c759'  // Green
          ],
          borderWidth: 0,
          borderRadius: 8
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor } }
      }
    }
  });
}

// ============================================================
// CrewAI / LangGraph Agent Crew Console Logic
// ============================================================
// ============================================================
// Google Gemini API Gateway (with version fallback)
// ============================================================
async function callGeminiApi(apiKey, prompt, base64Data = null) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const parts = [{ text: prompt }];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.candidates && resData.candidates.length > 0) {
          return resData.candidates[0].content.parts[0].text;
        }
      } else {
        console.warn(`Model ${model} returned HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn(`Model ${model} request error:`, err);
      lastError = err;
    }
  }
  throw new Error(lastError ? lastError.message : "Failed to generate content from all Gemini models.");
}

function initAgentCrewConsole() {
  const btn = document.getElementById('btn-agent-submit');
  const input = document.getElementById('agent-chat-input');
  
  btn.addEventListener('click', () => {
    const query = input.value.trim();
    if (!query) return;
    
    input.value = '';
    runAgentCrewSimulation(query);
  });

  // Gemini API Key Management
  const keyInput = document.getElementById('gemini-api-key');
  const saveKeyBtn = document.getElementById('btn-save-key');
  const clearKeyBtn = document.getElementById('btn-clear-key');

  if (keyInput && saveKeyBtn && clearKeyBtn) {
    const savedKey = localStorage.getItem('urbanguard-gemini-key');
    if (savedKey) {
      keyInput.value = savedKey;
    }

    saveKeyBtn.addEventListener('click', () => {
      const key = keyInput.value.trim();
      if (!key) {
        showToast('Please enter a valid API key.', 'warning');
        return;
      }
      localStorage.setItem('urbanguard-gemini-key', key);
      showToast('Gemini API Key saved successfully.', 'success');
    });

    clearKeyBtn.addEventListener('click', () => {
      keyInput.value = '';
      localStorage.removeItem('urbanguard-gemini-key');
      showToast('Gemini API Key cleared.', 'info');
    });
  }
}

async function runAgentCrewSimulation(query) {
  const logs = document.getElementById('agent-chat-logs');
  const catCard = document.getElementById('crew-agent-cat');
  const dispCard = document.getElementById('crew-agent-disp');
  const modCard = document.getElementById('crew-agent-mod');
  
  const submitBtn = document.getElementById('btn-agent-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running...`;
  }

  // Reset statuses
  [catCard, dispCard, modCard].forEach(card => {
    card.className = card.className.replace(' active', '').replace(' complete', '');
    const dot = card.querySelector('.agent-status-dot');
    dot.className = 'agent-status-dot idle';
  });

  // 1. Append User Input
  logs.innerHTML = '';
  const userDiv = document.createElement('div');
  userDiv.className = 'user-message-bubble';
  userDiv.innerText = `User request: "${query}"`;
  logs.appendChild(userDiv);
  logs.scrollTop = logs.scrollHeight;

  const apiKey = localStorage.getItem('urbanguard-gemini-key');

  if (!apiKey) {
    // Run Simulated Typing Loop
    runSimulatedAgentLoop(query, logs, catCard, dispCard, modCard);
    return;
  }

  // --- Live API Calling Pipeline ---
  showToast('Live agent crew loop started via Gemini API...', 'info');

  try {
    // Step 2: Classifier Agent
    catCard.classList.add('active');
    catCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';

    const divCat = document.createElement('div');
    divCat.className = 'agent-message-bubble';
    divCat.innerHTML = `
      <div class="agent-message-header" style="color: var(--color-primary);">
        <i class="fa-solid fa-tags"></i> Classifier Agent (Live Gemini API)
      </div>
      <div class="agent-message-body" id="live-cat">Analyzing text patterns & classifying...</div>
    `;
    logs.appendChild(divCat);
    logs.scrollTop = logs.scrollHeight;

    const catPrompt = `You are the Classifier Agent of the UrbanGuard Civic Intelligence Platform.
Your goal is to classify the category of the civic incident and estimate its severity (1 to 5).
The user reported: "${query}"
Available categories are:
- pothole (Road Damage)
- water_leak (Water Supply)
- streetlight (Streetlight Out)
- garbage (Garbage / Sanitation)
- drainage (Drainage / Flooding)
- electricity (Power / Electricity Hazards)
- sidewalk (Sidewalk Damage)
- graffiti (Vandalism)
- noise (Noise Pollution)
- construction (Illegal Construction)
- tree_hazard (Tree / Branch Hazard)
- traffic (Traffic Signal Issue)

Please output a conversational response. State the category you classified the incident as, the severity index (1-5), and a brief explanation of why, concluding with the exact string: "Forwarding parameters to SLA Dispatcher..."`;

    const catResponse = await callGeminiApi(apiKey, catPrompt);
    document.getElementById('live-cat').innerText = catResponse;

    catCard.classList.remove('active');
    catCard.classList.add('complete');
    catCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

    // Step 3: SLA Dispatcher Agent
    dispCard.classList.add('active');
    dispCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';

    const divDisp = document.createElement('div');
    divDisp.className = 'agent-message-bubble';
    divDisp.innerHTML = `
      <div class="agent-message-header" style="color: var(--color-warning);">
        <i class="fa-solid fa-truck-ramp-box"></i> SLA Dispatch Agent (Live Gemini API)
      </div>
      <div class="agent-message-body" id="live-disp">Calculating ward schedule & paging officers...</div>
    `;
    logs.appendChild(divDisp);
    logs.scrollTop = logs.scrollHeight;

    const dispPrompt = `You are the SLA Dispatch Agent of the UrbanGuard Civic Intelligence Platform.
Your goal is to calculate the SLA response window (in hours) and assign the local ward or public representative.
The user reported: "${query}"
The Classifier Agent provided this analysis:
"${catResponse}"

Please output a conversational response. State the SLA response window, the ward mapping (e.g. Koramangala, HSR Layout, MG Road, Indiranagar, Jayanagar, Hebbal based on any location words in the user query, defaulting to Koramangala if none match), and name the official contact paged (referring to a BBMP Ward Officer or BESCOM or BWSSB). Conclude with the exact string: "SLA scheduled. Passing to Moderator Agent..."`;

    const dispResponse = await callGeminiApi(apiKey, dispPrompt);
    document.getElementById('live-disp').innerText = dispResponse;

    dispCard.classList.remove('active');
    dispCard.classList.add('complete');
    dispCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

    // Step 4: Moderator Agent
    modCard.classList.add('active');
    modCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';

    const divMod = document.createElement('div');
    divMod.className = 'agent-message-bubble';
    divMod.innerHTML = `
      <div class="agent-message-header" style="color: var(--color-secondary);">
        <i class="fa-solid fa-magnifying-glass-location"></i> Moderator Agent (Live Gemini API)
      </div>
      <div class="agent-message-body" id="live-mod">Scanning geographic clusters & verifying uniqueness...</div>
    `;
    logs.appendChild(divMod);
    logs.scrollTop = logs.scrollHeight;

    const modPrompt = `You are the Moderator Agent of the UrbanGuard Civic Intelligence Platform.
Your goal is to verify that this is a unique incident, draft a concise user-facing title (max 60 characters), and output a structured JSON block summarizing the issue.
The user reported: "${query}"
The Classifier Agent analysis: "${catResponse}"
The SLA Dispatch Agent analysis: "${dispResponse}"

Please output a conversational response. State that you are scanning for duplicates, verifying coordinates, and registering the incident.
Then, conclude by outputting a JSON object enclosed in a markdown code block (i.e. between \`\`\`json and \`\`\`) with the exact keys:
{
  "title": "Concise user-facing title",
  "category": "lowercase category key (one of: pothole, water_leak, streetlight, garbage, drainage, electricity, sidewalk, graffiti, noise, construction, tree_hazard, traffic)",
  "priority": "one of: low, medium, high, critical",
  "description": "Clean detailed description",
  "address": "Estimated address or ward name"
}`;

    const modResponse = await callGeminiApi(apiKey, modPrompt);
    document.getElementById('live-mod').innerText = modResponse;

    modCard.classList.remove('active');
    modCard.classList.add('complete');
    modCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

    // Parse the JSON block from Moderator Response
    let newIssue = null;
    const jsonMatch = modResponse.match(/```json\s*([\s\S]*?)\s*```/) || modResponse.match(/({[\s\S]*?})/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.title && parsed.category) {
          const bangaloreCenterLat = 12.9716;
          const bangaloreCenterLng = 77.5946;
          const randomOffsetLat = (Math.random() - 0.5) * 0.08;
          const randomOffsetLng = (Math.random() - 0.5) * 0.08;
          
          newIssue = {
            id: `UG-${1000 + localIssues.length + 1}`,
            title: parsed.title,
            category: parsed.category,
            status: 'reported',
            description: parsed.description || query,
            location: {
              lat: bangaloreCenterLat + randomOffsetLat,
              lng: bangaloreCenterLng + randomOffsetLng,
              address: parsed.address || 'Bengaluru'
            },
            reportedBy: { name: 'AI Agent Crew (Live)', avatar: 'AI', level: 10 },
            reportedAt: new Date().toISOString(),
            upvotes: 1,
            verifications: 0,
            images: ['electric_whitefield.jpg'],
            priority: parsed.priority || 'medium',
            timeline: [
              { status: 'reported', at: new Date().toISOString(), by: 'AI Agent Crew' }
            ],
            comments: []
          };
        }
      } catch (err) {
        console.error('Failed to parse Moderator JSON:', err);
      }
    }

    if (newIssue) {
      localIssues.unshift(newIssue);
      localUser.issuesReported++;
      updateHeaderWidgets();
      
      // Refresh feed and map markers dynamically
      renderFeed();
      plotMapMarkers();
      
      const sysDiv = document.createElement('div');
      sysDiv.className = 'system-message';
      sysDiv.innerHTML = `
        <i class="fa-solid fa-check-double" style="color: var(--color-success);"></i>
        <p>Live Gemini Agent Loop complete. Incident registered successfully as <strong>${newIssue.id}</strong>! +100 XP Awarded.</p>
      `;
      logs.appendChild(sysDiv);
    } else {
      const sysDiv = document.createElement('div');
      sysDiv.className = 'system-message';
      sysDiv.innerHTML = `
        <i class="fa-solid fa-check-double" style="color: var(--color-success);"></i>
        <p>Live Gemini Agent Loop complete, but failed to extract structured JSON. Registered under standard fallback parameters. +100 XP Awarded.</p>
      `;
      logs.appendChild(sysDiv);
      createDynamicIssueFromAgent(query);
    }
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-play"></i> Run Loop`;
    }
    
    awardXP(100);
    logs.scrollTop = logs.scrollHeight;

  } catch (error) {
    console.error('Gemini API Error:', error);
    showToast(`Gemini API Error: ${error.message}. Falling back to simulation.`, 'warning');
    
    // Clear and run simulation fallback
    logs.innerHTML = '';
    const errorBubble = document.createElement('div');
    errorBubble.className = 'system-message';
    errorBubble.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--color-danger);"></i> <p>Live Gemini API failure: ${error.message}. Running offline simulation...</p>`;
    logs.appendChild(errorBubble);
    
    setTimeout(() => {
      runSimulatedAgentLoop(query, logs, catCard, dispCard, modCard);
    }, 2000);
  }
}

function runSimulatedAgentLoop(query, logs, catCard, dispCard, modCard) {
  const submitBtn = document.getElementById('btn-agent-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Running...`;
  }
  // 2. Trigger Classifier Agent
  setTimeout(() => {
    catCard.classList.add('active');
    catCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';
    
    const div = document.createElement('div');
    div.className = 'agent-message-bubble';
    div.innerHTML = `
      <div class="agent-message-header" style="color: var(--color-primary);">
        <i class="fa-solid fa-tags"></i> Classifier Agent (Gemini API Studio)
      </div>
      <div class="agent-message-body" id="type-cat">Typing response...</div>
    `;
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;

    // Simulate typing
    setTimeout(() => {
      let text = 'Analyzing text patterns...\nNLP Category Classified: `water_leak` (Water Supply).\nSeverity index: 4/5 (High).\nForwarding parameters to SLA Dispatcher...';
      if (query.toLowerCase().includes('pothole') || query.toLowerCase().includes('road')) {
        text = 'Analyzing text patterns...\nNLP Category Classified: `pothole` (Road Damage).\nSeverity index: 3/5 (Medium).\nForwarding parameters to SLA Dispatcher...';
      } else if (query.toLowerCase().includes('electric') || query.toLowerCase().includes('spark') || query.toLowerCase().includes('power')) {
        text = 'Analyzing text patterns...\nNLP Category Classified: `electricity` (Power Hazards).\nSeverity index: 5/5 (Critical).\nForwarding parameters to SLA Dispatcher...';
      }
      document.getElementById('type-cat').innerText = text;
      
      catCard.classList.remove('active');
      catCard.classList.add('complete');
      catCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

      // 3. Trigger SLA Dispatcher Agent
      setTimeout(() => {
        dispCard.classList.add('active');
        dispCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';

        const divDisp = document.createElement('div');
        divDisp.className = 'agent-message-bubble';
        divDisp.innerHTML = `
          <div class="agent-message-header" style="color: var(--color-warning);">
            <i class="fa-solid fa-truck-ramp-box"></i> SLA Dispatch Agent (LangGraph Loop)
          </div>
          <div class="agent-message-body" id="type-disp">Calculating ward schedule...</div>
        `;
        logs.appendChild(divDisp);
        logs.scrollTop = logs.scrollHeight;

        setTimeout(() => {
          let textDisp = 'BWSSB Ward SLA guidelines loaded.\nCalculated response window: 6 Hours.\nWard mapping found: Ward 151 (Koramangala Central Zone).\nOfficial contact notified: muralidhar.officer@bbmp.gov.in.';
          if (query.toLowerCase().includes('pothole') || query.toLowerCase().includes('road')) {
            textDisp = 'PWD Ward SLA guidelines loaded.\nCalculated response window: 48 Hours.\nWard mapping found: Ward 174 (HSR Layout Zone).\nOfficial contact notified: geetha.officer@bbmp.gov.in.';
          } else if (query.toLowerCase().includes('electric') || query.toLowerCase().includes('spark') || query.toLowerCase().includes('power')) {
            textDisp = 'BESCOM Critical Hazard SLA loaded.\nCalculated response window: 4 Hours.\nWard mapping found: Central Zone (MG Road).\nBESCOM Emergency dispatch line paged: 080-22942289.';
          }
          document.getElementById('type-disp').innerText = textDisp;

          dispCard.classList.remove('active');
          dispCard.classList.add('complete');
          dispCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

          // 4. Trigger Moderator Agent
          setTimeout(() => {
            modCard.classList.add('active');
            modCard.querySelector('.agent-status-dot').className = 'agent-status-dot active';

            const divMod = document.createElement('div');
            divMod.className = 'agent-message-bubble';
            divMod.innerHTML = `
              <div class="agent-message-header" style="color: var(--color-secondary);">
                <i class="fa-solid fa-magnifying-glass-location"></i> Moderator Agent (CrewAI Coordinator)
              </div>
              <div class="agent-message-body" id="type-mod">Checking duplication indexes...</div>
            `;
            logs.appendChild(divMod);
            logs.scrollTop = logs.scrollHeight;

            setTimeout(() => {
              const textMod = 'Scanning geographic clusters in MongoDB...\nDuplicate check: 0 similar reports within 500m area.\nIncident verified unique.\nMap pin plotted. Timeline initialized.\nState registered successfully.';
              document.getElementById('type-mod').innerText = textMod;

              modCard.classList.remove('active');
              modCard.classList.add('complete');
              modCard.querySelector('.agent-status-dot').className = 'agent-status-dot complete';

              // 5. Finalize loop and create dynamic issue
              setTimeout(() => {
                const sysDiv = document.createElement('div');
                sysDiv.className = 'system-message';
                sysDiv.innerHTML = `
                  <i class="fa-solid fa-check-double" style="color: var(--color-success);"></i>
                  <p>CrewAI Multi-Agent Graph Loop complete. Incident registered on Live Zone Map and Report Feed. +100 XP Awarded!</p>
                `;
                logs.appendChild(sysDiv);
                logs.scrollTop = logs.scrollHeight;

                // Create a dynamic issue in feed
                createDynamicIssueFromAgent(query);
                awardXP(100);
                
                // Re-enable button
                const finalBtn = document.getElementById('btn-agent-submit');
                if (finalBtn) {
                  finalBtn.disabled = false;
                  finalBtn.innerHTML = `<i class="fa-solid fa-play"></i> Run Loop`;
                }
              }, 1000);

            }, 1500);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1500);
  }, 1000);
}

function createDynamicIssueFromAgent(query) {
  let category = 'water_leak';
  let priority = 'high';
  let address = 'Koramangala, Bangalore';
  let title = 'Water leak incident detected';

  if (query.toLowerCase().includes('pothole') || query.toLowerCase().includes('road')) {
    category = 'pothole';
    priority = 'medium';
    address = 'HSR Layout, Bangalore';
    title = 'Road damage detected';
  } else if (query.toLowerCase().includes('electric') || query.toLowerCase().includes('spark') || query.toLowerCase().includes('power')) {
    category = 'electricity';
    priority = 'critical';
    address = 'MG Road, Bangalore';
    title = 'Electrical sparking hazard detected';
  }

  // Set title dynamically based on query length
  if (query.length < 50) {
    title = query;
  } else {
    title = query.slice(0, 45) + '...';
  }

  const newIssueId = `UG-${1000 + localIssues.length + 1}`;
  const bangaloreCenterLat = 12.9716;
  const bangaloreCenterLng = 77.5946;
  const randomOffsetLat = (Math.random() - 0.5) * 0.08;
  const randomOffsetLng = (Math.random() - 0.5) * 0.08;

  const newIssue = {
    id: newIssueId,
    title,
    category,
    status: 'reported',
    description: query,
    location: {
      lat: bangaloreCenterLat + randomOffsetLat,
      lng: bangaloreCenterLng + randomOffsetLng,
      address
    },
    reportedBy: { name: 'AI Agent Crew', avatar: 'AI', level: 10 },
    reportedAt: new Date().toISOString(),
    upvotes: 1,
    verifications: 0,
    images: ['electric_whitefield.jpg'],
    priority,
    timeline: [
      { status: 'reported', at: new Date().toISOString(), by: 'AI Agent Crew' }
    ],
    comments: []
  };

  localIssues.unshift(newIssue);
  localUser.issuesReported++;
  
  // Refresh feed and map markers dynamically
  renderFeed();
  plotMapMarkers();
}


// ============================================================
// Multilingual Speech-to-Text Dictation
// ============================================================
function initSpeechRecognition() {
  const searchMicBtn = document.getElementById('btn-voice-search');
  const descMicBtn = document.getElementById('btn-voice-description');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (searchMicBtn) searchMicBtn.style.display = 'none';
    if (descMicBtn) descMicBtn.style.display = 'none';
    console.log("Speech recognition not supported in this browser.");
    return;
  }

  const setupRecognition = (btn, targetInput) => {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Supports multilingual inputs naturally in Chrome

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.classList.contains('listening')) {
        recognition.stop();
        return;
      }

      btn.classList.add('listening');
      showToast('Listening... Speak now.', 'info');
      recognition.start();
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (targetInput.tagName === 'INPUT' || targetInput.tagName === 'TEXTAREA') {
        targetInput.value = targetInput.value ? targetInput.value + ' ' + transcript : transcript;
        targetInput.dispatchEvent(new Event('input'));
      }
    };

    recognition.onerror = (err) => {
      console.error("Speech Recognition Error:", err);
      btn.classList.remove('listening');
      showToast(`Voice input error: ${err.error}`, 'warning');
    };

    recognition.onend = () => {
      btn.classList.remove('listening');
    };
  };

  if (searchMicBtn) {
    setupRecognition(searchMicBtn, document.getElementById('feed-search-input'));
  }
  if (descMicBtn) {
    setupRecognition(descMicBtn, document.getElementById('issue-description'));
  }
}

// ============================================================
// Gemini Vision Multimodal Auto-Fill
// ============================================================
async function analyzeAttachedImage(chosenImage) {
  const apiKey = localStorage.getItem('urbanguard-gemini-key');
  if (!apiKey) {
    simulateFormAutoFill(chosenImage);
    return;
  }

  showToast('Gemini Vision is analyzing visual markers in the photo...', 'info');

  const titleInput = document.getElementById('issue-title');
  const descInput = document.getElementById('issue-description');
  const categorySelect = document.getElementById('issue-category');
  const prioritySelect = document.getElementById('issue-priority');

  titleInput.value = 'Analyzing image...';
  descInput.value = 'Gemini Vision is scanning objects, classifying hazard type, and drafting report...';

  try {
    const responseBlob = await fetch(`./images/${chosenImage}`);
    const blob = await responseBlob.blob();

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const prompt = `Analyze this civic hazard image. Classify its category and severity, then provide a JSON block outputting the fields.
Return ONLY a valid JSON object in a markdown code block (i.e. between \`\`\`json and \`\`\`) with these keys:
{
  "title": "Short title describing the issue (e.g. Broken water pipe on street)",
  "category": "lowercase category key (one of: pothole, water_leak, streetlight, garbage, drainage, electricity, sidewalk, graffiti, noise, construction, tree_hazard, traffic)",
  "priority": "one of: low, medium, high, critical",
  "description": "Detailed description explaining what is shown in the image and its safety impact"
}`;

    const responseText = await callGeminiApi(apiKey, prompt, base64Data);

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*?})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      titleInput.value = parsed.title || '';
      descInput.value = parsed.description || '';
      if (parsed.category) categorySelect.value = parsed.category;
      if (parsed.priority) prioritySelect.value = parsed.priority;

      showToast('Gemini Vision auto-filled the form successfully!', 'success');
    } else {
      throw new Error('Failed to parse JSON response');
    }

  } catch (error) {
    console.error('Gemini Vision Error:', error);
    showToast(`Vision analysis failed: ${error.message}. Running offline mock auto-fill.`, 'warning');
    simulateFormAutoFill(chosenImage);
  }
}

function simulateFormAutoFill(chosenImage) {
  const titleInput = document.getElementById('issue-title');
  const descInput = document.getElementById('issue-description');
  const categorySelect = document.getElementById('issue-category');
  const prioritySelect = document.getElementById('issue-priority');

  if (chosenImage.includes('pothole')) {
    titleInput.value = 'Deep pothole blocking main lane';
    descInput.value = 'A large pothole has formed in the middle of the road. It has sharp edges and poses a major puncture and collision hazard for two-wheelers.';
    categorySelect.value = 'pothole';
    prioritySelect.value = 'medium';
  } else if (chosenImage.includes('water')) {
    titleInput.value = 'Water main line burst flooding street';
    descInput.value = 'A pipeline burst has occurred, causing water to gush out under high pressure and flood the road, disrupting traffic.';
    categorySelect.value = 'water_leak';
    prioritySelect.value = 'high';
  } else {
    titleInput.value = 'Exposed sparking power line';
    descInput.value = 'An electrical line has broken and is hanging low near the sidewalk, sparking occasionally and posing an immediate electrocution hazard.';
    categorySelect.value = 'electricity';
    prioritySelect.value = 'critical';
  }
  showToast('Offline mock auto-filled parameters.', 'info');
}
