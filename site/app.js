(function () {
  'use strict';

  var projects = [];
  var categories = [];
  var currentIdeaId = null;
  var currentIdea = null;
  var currentRating = 0;
  var viewHistoryIds = [];

  // ─── Data Loading ──────────────────────────────────────────
  async function loadProjects() {
    try {
      var res = await fetch('../data/ideas.json');
      var data = await res.json();
      projects = data.projects || [];
      categories = data.categories || [];
    } catch (e) {
      console.warn('GradHub: fetch failed (file:/// CORS), using inline data', e);
      if (window.__IDEAS_DATA__) {
        projects = window.__IDEAS_DATA__.projects || [];
        categories = window.__IDEAS_DATA__.categories || [];
      }
    }
    if (!categories.length) {
      var s = new Set();
      projects.forEach(function (p) { if (p.category) s.add(p.category); });
      categories = Array.from(s);
    }
  }

  function getProjectById(id) {
    return projects.find(function (p) { return p.id === id; }) || null;
  }

  // ─── Navigation ────────────────────────────────────────────
  function highlightActiveNav() {
    var page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === page);
    });
  }

  function setupMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        links.classList.toggle('open');
      });
      document.addEventListener('click', function () { links.classList.remove('open'); });
    }
  }

  // ─── Dark Mode ─────────────────────────────────────────────
  function applyTheme() {
    var saved = localStorage.getItem('gradhub_theme') || 'light';
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = isDark ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('gradhub_theme', next);
  }

  function setupDarkToggle() {
    var btn = document.querySelector('.dark-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  }

  // ─── Toast ─────────────────────────────────────────────────
  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._hide);
    el._hide = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  // ─── Local Storage Helpers ─────────────────────────────────
  function getReviews() {
    try {
      var reviews = JSON.parse(localStorage.getItem('naked_reviews') || '[]');
      var byIdea = {};
      reviews.forEach(function (review) {
        var existing = byIdea[review.ideaId];
        if (!existing || new Date(review.date || 0) >= new Date(existing.date || 0)) {
          byIdea[review.ideaId] = review;
        }
      });
      var deduped = Object.keys(byIdea).map(function (id) { return byIdea[id]; });
      if (deduped.length !== reviews.length) {
        localStorage.setItem('naked_reviews', JSON.stringify(deduped));
      }
      return deduped;
    } catch (e) { return []; }
  }

  function saveReview(entry) {
    var reviews = getReviews();
    var idx = -1;
    for (var i = 0; i < reviews.length; i++) {
      if (reviews[i].ideaId === entry.ideaId) { idx = i; break; }
    }
    if (idx !== -1) { reviews[idx] = entry; }
    else { reviews.push(entry); }
    localStorage.setItem('naked_reviews', JSON.stringify(reviews));
    updatePreferences();
  }

  function getViewed() {
    try { return JSON.parse(localStorage.getItem('naked_viewed') || '[]'); } catch (e) { return []; }
  }

  function markViewed(id) {
    var v = getViewed();
    if (v.indexOf(id) === -1) { v.push(id); localStorage.setItem('naked_viewed', JSON.stringify(v)); }
  }

  function getPreferences() {
    try { return JSON.parse(localStorage.getItem('naked_prefs') || 'null') || defaultPrefs(); } catch (e) { return defaultPrefs(); }
  }

  function defaultPrefs() {
    return { likedCategories: {}, dislikedCategories: {}, keywords: [] };
  }

  function getApiBaseUrl() {
    return window.GRAD_HUB_API_URL || localStorage.getItem('gradhub_api_url') || 'http://localhost:3000';
  }

  async function fetchBackendPreferences() {
    try {
      var res = await fetch(getApiBaseUrl() + '/api/preferences');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var body = await res.json();
      var prefs = body && body.success ? body.data : null;
      // #region agent log
      fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H7,H9,H10',location:'site/app.js:fetchBackendPreferences',message:'static preferences fetched backend preferences',data:{apiBaseUrl:getApiBaseUrl(),hasPreferences:Boolean(prefs),excludedCategories:prefs && prefs.excluded_categories,categoryWeights:prefs && prefs.category_weights,href:window.location.href},timestamp:Date.now()})}).catch(function(){});
      // #endregion
      return prefs;
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H7,H9,H10',location:'site/app.js:fetchBackendPreferences',message:'static preferences backend fetch failed',data:{apiBaseUrl:getApiBaseUrl(),error:e && e.message,href:window.location.href},timestamp:Date.now()})}).catch(function(){});
      // #endregion
      return null;
    }
  }

  function backendPrefsToLocalShape(backendPrefs) {
    if (!backendPrefs) return null;
    var likedCategories = {};
    Object.keys(backendPrefs.category_weights || {}).forEach(function (category) {
      var weight = backendPrefs.category_weights[category];
      if (weight > 0) likedCategories[category] = Math.round(weight * 100);
    });
    var keywords = Object.keys(backendPrefs.keyword_weights || {}).sort(function (a, b) {
      return backendPrefs.keyword_weights[b] - backendPrefs.keyword_weights[a];
    });
    return {
      likedCategories: likedCategories,
      dislikedCategories: {},
      keywords: keywords,
      backend: backendPrefs
    };
  }

  function updatePreferences() {
    var reviews = getReviews();
    var likedCategories = {};
    var dislikedCategories = {};
    var keywordCounts = {};
    reviews.forEach(function (r) {
      if (r.category) {
        if (r.rating >= 3) {
          likedCategories[r.category] = (likedCategories[r.category] || 0) + r.rating;
        } else if (r.rating <= 2) {
          dislikedCategories[r.category] = (dislikedCategories[r.category] || 0) + 1;
        }
      }
      if (r.comment) {
        r.comment.split(/\s+/).forEach(function (w) {
          w = w.replace(/[^\u0600-\u06FF\w]/g, '');
          if (w.length > 3) keywordCounts[w] = (keywordCounts[w] || 0) + 1;
        });
      }
    });
    var sorted = Object.keys(keywordCounts).sort(function (a, b) { return keywordCounts[b] - keywordCounts[a]; });
    var prefs = getPreferences();
    prefs.likedCategories = likedCategories;
    prefs.dislikedCategories = dislikedCategories;
    prefs.keywords = sorted.slice(0, 20);
    localStorage.setItem('naked_prefs', JSON.stringify(prefs));
  }

  // ─── Idea Selection ────────────────────────────────────────
  function scoreIdea(idea, prefs) {
    var score = 0;
    if (prefs.likedCategories && idea.category) {
      var catScore = prefs.likedCategories[idea.category] || 0;
      score += catScore * 3;
    }
    if (prefs.keywords && prefs.keywords.length) {
      var desc = (idea.short_desc_ar || idea.description || '').toLowerCase();
      prefs.keywords.forEach(function (kw) {
        if (desc.indexOf(kw.toLowerCase()) !== -1) score += 2;
      });
    }
    if (prefs.dislikedCategories && prefs.dislikedCategories[idea.category]) {
      score -= 10;
    }
    return score;
  }

  function getNextUnviewed() {
    var viewed = getViewed();
    var prefs = getPreferences();
    var pool = projects.filter(function (p) { return viewed.indexOf(p.id) === -1; });
    if (!pool.length) return null;
    pool.sort(function (a, b) { return scoreIdea(b, prefs) - scoreIdea(a, prefs); });
    return pool[0];
  }

  function getRandomIdea() {
    return projects.length ? projects[Math.floor(Math.random() * projects.length)] : null;
  }

  // ─── Dashboard Core ────────────────────────────────────────
  function showIdea(idea, pushHistory) {
    if (!idea) { showEmpty(); return; }
    if (pushHistory !== false && currentIdeaId) {
      viewHistoryIds.push(currentIdeaId);
    }
    currentIdeaId = idea.id;
    currentIdea = idea;
    currentRating = 0;
    markViewed(idea.id);

    var card = document.getElementById('ideaCard');
    if (!card) return;

    var techs = (idea.technologies || []).map(function (t) {
      return '<span class="badge">' + escapeHtml(t) + '</span>';
    }).join(' ');

    var uni = escapeHtml(idea.university || idea.author || 'غير محدد');
    var uniLoc = idea.university_location ? escapeHtml(' — ' + idea.university_location) : '';
    var diffStars = idea.difficulty ? '•'.repeat({ مبتدئ: 1, متوسط: 2, متقدم: 3 }[idea.difficulty] || 2) : '•'.repeat(2);

    var prefs = getPreferences();
    var prefScore = scoreIdea(idea, prefs);
    var prefBadge = '';
    if (prefScore > 0) prefBadge = '<span class="pref-match">✦ يتوافق مع تفضيلاتك</span>';

    card.innerHTML =
      '<div class="id-badge">رقم ' + idea.id + prefBadge + '</div>' +
      '<h2>' + escapeHtml(idea.title_ar || idea.title) + '</h2>' +
      (idea.title_en ? '<div class="title-en">' + escapeHtml(idea.title_en) + '</div>' : '') +
      '<span class="category">' + escapeHtml(idea.category || '') + '</span>' +
      '<div class="univ">🏛️ ' + uni + '</div>' +
      (uniLoc ? '<div class="univ-loc">📍' + uniLoc + '</div>' : '') +
      (idea.difficulty ? '<div class="univ-loc">📊 ' + escapeHtml(idea.difficulty) + '</div>' : '') +
      '<div class="description">' + escapeHtml(idea.description || '') + '</div>' +
      '<div class="tech-tags">' + (techs || '<span class="badge">تقنيات غير محددة</span>') + '</div>';

    updateProgress();
    if (window.GradHub.criticTimer) { clearTimeout(window.GradHub.criticTimer); window.GradHub.criticTimer = null; }
    document.getElementById('starRating').querySelectorAll('.star').forEach(function (s) {
      s.classList.remove('active');
    });
    document.getElementById('userComment').value = '';
    var cp = document.getElementById('criticPanel');
    if (cp) { cp.style.display = 'none'; cp.innerHTML = ''; }

    document.getElementById('ideaViewer').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
  }

  function showWelcome() {
    var idea = getNextUnviewed() || getRandomIdea();
    if (idea) showIdea(idea);
    else showEmpty();
  }

  function showEmpty() {
    document.getElementById('ideaViewer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    var cp = document.getElementById('criticPanel');
    if (cp) { cp.style.display = 'none'; cp.innerHTML = ''; }
  }

  function updateProgress() {
    var viewed = getViewed().length;
    var total = projects.length;
    var el1 = document.getElementById('reviewedCount');
    var el2 = document.getElementById('remainingCount');
    if (el1) el1.textContent = Math.min(viewed, total);
    if (el2) el2.textContent = Math.max(0, total - viewed);
  }

  // ─── Star Rating UI ────────────────────────────────────────
  function setupStars() {
    var container = document.getElementById('starRating');
    if (!container) return;
    container.querySelectorAll('.star').forEach(function (s) {
      s.addEventListener('click', function () {
        var val = parseInt(this.getAttribute('data-value'), 10);
        currentRating = val;
        container.querySelectorAll('.star').forEach(function (star, idx) {
          star.classList.toggle('active', idx < val);
        });
      });
    });
  }

  // ─── Public API ────────────────────────────────────────────
  var gh = window.GradHub || {};

  gh.init = async function () {
    await loadProjects();
    highlightActiveNav();
    setupMobileNav();
    applyTheme();
    setupDarkToggle();
    setupStars();
    var hash = window.location.hash;
    if (hash && hash.indexOf('idea-') === 1) {
      var id = parseInt(hash.replace('#idea-', ''), 10);
      var proj = getProjectById(id);
      if (proj) { showIdea(proj, true); return; }
    }
    var viewed = getViewed();
    var remaining = projects.filter(function (p) { return viewed.indexOf(p.id) === -1; });
    var idea = remaining.length ? getNextUnviewed() : getRandomIdea();
    if (idea) showIdea(idea);
    else showEmpty();
  };

  gh.startSession = function () {
    localStorage.removeItem('naked_viewed');
    updateProgress();
    var idea = getNextUnviewed() || getRandomIdea();
    if (idea) showIdea(idea);
    else showEmpty();
  };

  gh.saveAndNext = function () {
    if (!currentIdeaId || !currentIdea) return;
    var comment = document.getElementById('userComment').value.trim();
    var rating = currentRating;
    if (rating === 0) { showToast('يرجى اختيار تقييم قبل الحفظ.'); return; }
    saveReview({
      ideaId: currentIdeaId,
      title: currentIdea.title_ar || currentIdea.title_en || currentIdea.title || '',
      category: currentIdea.category || '',
      rating: rating,
      comment: comment,
      date: new Date().toISOString()
    });
    showToast('✓ تم حفظ التقييم');
    var next = getNextUnviewed();
    if (next) showIdea(next);
    else showEmpty();
  };

  gh.goBack = function () {
    if (!viewHistoryIds.length) { showToast('لا توجد فكرة سابقة'); return; }
    var prevId = viewHistoryIds.pop();
    var prev = getProjectById(prevId);
    if (!prev) { showEmpty(); return; }
    showIdea(prev, false);
    var reviews = getReviews();
    for (var i = 0; i < reviews.length; i++) {
      if (reviews[i].ideaId === prevId) {
        currentRating = reviews[i].rating;
        document.getElementById('starRating').querySelectorAll('.star').forEach(function (s, idx) {
          s.classList.toggle('active', idx < reviews[i].rating);
        });
        if (reviews[i].comment) {
          document.getElementById('userComment').value = reviews[i].comment;
        }
        break;
      }
    }
    showToast('↩ تم العودة للفكرة السابقة');
  };

  gh.skipIdea = function () {
    if (!currentIdeaId) return;
    showToast('⏭ تم تخطي الفكرة');
    var next = getNextUnviewed();
    if (next) showIdea(next);
    else showEmpty();
  };

  gh.deleteReview = function (ideaId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    var reviews = getReviews();
    var idx = -1;
    for (var i = 0; i < reviews.length; i++) {
      if (reviews[i].ideaId === ideaId) { idx = i; break; }
    }
    if (idx === -1) { showToast('التقييم غير موجود'); return; }
    reviews.splice(idx, 1);
    localStorage.setItem('naked_reviews', JSON.stringify(reviews));
    showToast('🗑️ تم حذف التقييم');
    if (gh.renderHistoryTable) gh.renderHistoryTable();
  };

  gh.analyzeIdea = function () {
    if (!currentIdea) return;
    if (gh.Critic) {
      gh.Critic.analyze(currentIdea);
    } else {
      var panel = document.getElementById('criticPanel');
      if (panel) {
        panel.style.display = 'block';
        panel.innerHTML = '<div class="alert alert-warning">المحلل الناقض غير متاح حالياً.</div>';
      }
    }
  };

  gh.resetSession = function () {
    localStorage.removeItem('naked_viewed');
    localStorage.removeItem('naked_reviews');
    localStorage.removeItem('naked_prefs');
    showToast('تم إعادة تعيين الجلسة');
    var idea = getNextUnviewed() || getRandomIdea();
    if (idea) showIdea(idea);
    else showEmpty();
  };

  // ── Preferences Page ──
  gh.renderPreferences = async function () {
    var backendPrefs = await fetchBackendPreferences();
    var prefs = backendPrefsToLocalShape(backendPrefs) || getPreferences();
    var cats = Object.keys(prefs.likedCategories);
    var maxRating = 0;
    cats.forEach(function (c) { if (prefs.likedCategories[c] > maxRating) maxRating = prefs.likedCategories[c]; });
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H7,H8,H9,H10',location:'site/app.js:renderPreferences',message:'static preferences render data selected',data:{source:backendPrefs ? 'backend' : 'localStorage',categoryCount:cats.length,categories:cats,keywords:prefs.keywords,href:window.location.href},timestamp:Date.now()})}).catch(function(){});
    // #endregion

    var catList = document.getElementById('favCategoriesList');
    if (catList) {
      if (!cats.length) {
        catList.innerHTML = '<p class="text-muted">لا توجد بيانات كافية بعد.</p>';
      } else {
        catList.innerHTML = '<ul>' + cats.sort(function (a, b) { return prefs.likedCategories[b] - prefs.likedCategories[a]; }).map(function (c) {
          var pct = maxRating > 0 ? (prefs.likedCategories[c] / maxRating * 100) : 0;
          return '<li><span>' + escapeHtml(c) + '</span><div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%"></div></div><span class="stat-num">' + prefs.likedCategories[c] + '</span></li>';
        }).join('') + '</ul>';
      }
    }

    var diffEl = document.getElementById('difficultyContent');
    if (diffEl) {
      var reviews = getReviews();
      if (!reviews.length) {
        diffEl.innerHTML = '<p class="text-muted">لا توجد بيانات كافية بعد.</p>';
      } else {
          var diffCounts = {};
          reviews.forEach(function (r) {
            var proj = getProjectById(r.ideaId);
            var d = (proj && proj.difficulty) || 'متوسط';
            diffCounts[d] = (diffCounts[d] || 0) + 1;
          });
          var diffHtml = '<ul>';
          var diffOrder = ['مبتدئ', 'متوسط', 'متقدم'];
          diffOrder.forEach(function (d) {
            if (diffCounts[d]) diffHtml += '<li><span>' + d + '</span><span class="stat-num">' + diffCounts[d] + ' مراجعة</span></li>';
          });
          diffHtml += '</ul>';
          diffEl.innerHTML = diffHtml;
        }
      }

      // Keywords
      var kwEl = document.getElementById('keywordsContent');
      if (kwEl) {
        var kws = prefs.keywords || [];
        if (!kws.length) {
          kwEl.innerHTML = '<p class="text-muted">لا توجد بيانات كافية بعد.</p>';
        } else {
          kwEl.innerHTML = '<div class="tag-list">' + kws.slice(0, 15).map(function (kw) {
            return '<span class="tag">' + escapeHtml(kw) + '</span>';
          }).join('') + '</div>';
        }
      }

      // Empty state
      var empty = document.getElementById('emptyPrefs');
      var cards = document.getElementById('prefCards');
      if (empty && cards) {
        if (!reviews.length && !backendPrefs) {
          empty.style.display = 'block';
          cards.style.display = 'none';
        } else {
          empty.style.display = 'none';
          cards.style.display = 'block';
        }
      }

      // Liked ideas list
      var likedEl = document.getElementById('likedIdeasList');
      if (likedEl) {
        var highRated = reviews.filter(function (r) { return r.rating >= 4; });
        if (!highRated.length) {
          likedEl.innerHTML = '<p class="text-muted">لم تقيّم أي فكرة بتقييم عالٍ (٤+) بعد.</p>';
        } else {
          likedEl.innerHTML = '<ul>' + highRated.sort(function (a, b) { return b.rating - a.rating; }).map(function (r) {
            var proj = getProjectById(r.ideaId);
            var projTitle = (proj && proj.title_ar) || r.title || ('فكرة #' + r.ideaId);
            var projCat = (proj && proj.category) || r.category || '';
            var catBadge = projCat ? ' <span class="badge">' + escapeHtml(projCat) + '</span>' : '';
            var stars = '';
            for (var s = 0; s < r.rating; s++) stars += '⭐';
            return '<li><a href="index.html#idea-' + r.ideaId + '">' + escapeHtml(projTitle) + '</a>' + catBadge + ' <span class="stat-num">' + stars + '</span></li>';
          }).join('') + '</ul>';
        }
      }
    };

  gh.resetAllData = function () {
    localStorage.removeItem('naked_viewed');
    localStorage.removeItem('naked_reviews');
    localStorage.removeItem('naked_prefs');
    showToast('🗑️ تم حذف جميع البيانات');
    if (gh.renderPreferences) gh.renderPreferences();
  };

  // ── History Page ──
  gh.renderHistoryTable = function () {
    var tbody = document.getElementById('historyTableBody');
    var statsEl = document.getElementById('historyStats');
    var emptyEl = document.getElementById('emptyHistory');
    var wrap = document.getElementById('historyTableWrap');
    if (!tbody) return;

    var reviews = getReviews();
    if (!reviews.length) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (wrap) wrap.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (wrap) wrap.style.display = 'block';

    var sortBy = document.getElementById('sortSelect');
    var sortVal = sortBy ? sortBy.value : 'date-desc';

    var sorted = reviews.slice().sort(function (a, b) {
      switch (sortVal) {
        case 'date-asc': return new Date(a.date) - new Date(b.date);
        case 'rating-desc': return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc': return (a.rating || 0) - (b.rating || 0);
        case 'category': return (a.category || '').localeCompare(b.category || '');
        default: return new Date(b.date) - new Date(a.date);
      }
    });

    if (statsEl) {
      var avg = reviews.reduce(function (s, r) { return s + (r.rating || 0); }, 0) / reviews.length;
      var catSet = {};
      reviews.forEach(function (r) { if (r.category) catSet[r.category] = true; });
      statsEl.innerHTML =
        '<div class="stat-card"><div class="num">' + reviews.length + '</div><div class="label">إجمالي المراجعات</div></div>' +
        '<div class="stat-card"><div class="num">' + avg.toFixed(1) + '</div><div class="label">متوسط التقييم</div></div>' +
        '<div class="stat-card"><div class="num">' + Object.keys(catSet).length + '</div><div class="label">فئات مختلفة</div></div>';
    }

    tbody.innerHTML = sorted.map(function (r, idx) {
      var cls = 'rating-badge';
      if (r.rating >= 4) cls += ' rating-high';
      else if (r.rating >= 3) cls += ' rating-mid';
      else cls += ' rating-low';

        var dateStr = r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '-';
        var commentHtml = r.comment ? '<span class="comment-truncate" title="' + escapeHtml(r.comment) + '">' + escapeHtml(r.comment) + '</span>' : '<span class="text-muted">—</span>';
        var delBtn = '<button class="btn btn-sm btn-ghost" onclick="GradHub.deleteReview(' + r.ideaId + ')" title="حذف">🗑️ حذف</button>';
        var proj = getProjectById(r.ideaId);
        var ideaTitle = (proj && (proj.title_ar || proj.title_en)) || r.title || ('فكرة #' + r.ideaId);

        return '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td><a href="idea-detail.html?id=' + r.ideaId + '">' + escapeHtml(ideaTitle) + '</a></td>' +
          '<td>' + escapeHtml(r.category || '-') + '</td>' +
          '<td><span class="' + cls + '">' + r.rating + '/5</span></td>' +
          '<td>' + commentHtml + '</td>' +
          '<td>' + dateStr + '</td>' +
          '<td>' + delBtn + '</td>' +
          '</tr>';
    }).join('');
  };

  gh.exportHistory = function () {
    var reviews = getReviews();
    if (!reviews.length) { showToast('لا توجد بيانات للتصدير'); return; }
    var blob = new Blob([JSON.stringify(reviews, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'naked_reviews_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 تم تصدير السجل بنجاح');
  };

  gh.renderIdeaDetail = function () {
    var params = new URLSearchParams(window.location.search);
    var ideaId = parseInt(params.get('id') || '', 10);
    var idea = getProjectById(ideaId);
    var container = document.getElementById('ideaDetailCard');
    if (!container) return;

    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H11,H12',location:'site/app.js:renderIdeaDetail',message:'static idea detail render requested',data:{ideaId:ideaId,found:Boolean(idea),href:window.location.href},timestamp:Date.now()})}).catch(function(){});
    // #endregion

    if (!idea) {
      container.innerHTML = '<div class="empty-state"><p>لم يتم العثور على الفكرة.</p><a class="btn btn-accent" href="history.html">رجوع للسجل</a></div>';
      return;
    }

    var techs = (idea.technologies || idea.tech_stack || []).map(function (tech) {
      return '<span class="badge">' + escapeHtml(tech) + '</span>';
    }).join(' ');
    container.innerHTML =
      '<div class="idea-viewer">' +
      '<div class="id-badge">رقم ' + idea.id + '</div>' +
      '<h2>' + escapeHtml(idea.title_ar || idea.title || '') + '</h2>' +
      (idea.title_en ? '<div class="title-en">' + escapeHtml(idea.title_en) + '</div>' : '') +
      '<span class="category">' + escapeHtml(idea.category || '') + '</span>' +
      '<div class="univ">🏛️ ' + escapeHtml(idea.university || 'غير محدد') + '</div>' +
      '<div class="description">' + escapeHtml(idea.description || idea.short_desc_ar || '') + '</div>' +
      '<div class="tech-tags">' + techs + '</div>' +
      '</div>';

    if (gh.Critic) gh.Critic.analyze(idea);
  };

  gh.getProjects = function () { return projects.slice(); };
  gh.getProjectById = getProjectById;
  gh.getCategories = function () { return categories.slice(); };

  gh.searchProjects = function (query) {
    if (!query || !query.trim()) return projects.slice();
    var q = query.trim().toLowerCase();
    return projects.filter(function (p) {
      return (
        (p.title && p.title.toLowerCase().indexOf(q) !== -1) ||
        (p.description && p.description.toLowerCase().indexOf(q) !== -1) ||
        (p.category && p.category.toLowerCase().indexOf(q) !== -1) ||
        (p.technologies && p.technologies.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; })) ||
        (p.tags && p.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; }))
      );
    });
  };

  gh.renderProjects = function (projectList, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!projectList.length) { container.innerHTML = '<div class="alert alert-info">لا توجد مشاريع حالياً.</div>'; return; }
    container.innerHTML = projectList.map(function (p) {
      var techs = (p.technologies || []).map(function (t) { return '<span class="badge">' + escapeHtml(t) + '</span>'; }).join(' ');
      return '<div class="card">' +
        '<h3 class="card-title">' + escapeHtml(p.title) + '</h3>' +
        '<p class="card-text">' + escapeHtml(p.description || '') + '</p>' +
        '<div class="card-footer">' +
        '<span class="badge badge-primary">' + escapeHtml(p.category || '') + '</span> ' +
        techs +
        '<br><small class="text-muted">' + escapeHtml(p.author || p.university || '') + ' — ' + escapeHtml(p.date || '') + '</small>' +
        '</div></div>';
    }).join('');
  };

  window.GradHub = gh;

  // ─── Utility ───────────────────────────────────────────────
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Page-Specific Init ────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var page = window.location.pathname.split('/').pop();

    if (page === 'preferences.html') {
      window.GradHub.init().then(function () {
        window.GradHub.renderPreferences();
      });
    } else if (page === 'history.html') {
      window.GradHub.init().then(function () {
        window.GradHub.renderHistoryTable();
      });
    } else if (page === 'idea-detail.html') {
      window.GradHub.init().then(function () {
        window.GradHub.renderIdeaDetail();
      });
    } else if (page === 'ideas.html') {
      /* init + render handled by ideas.html inline script */
    } else {
      window.GradHub.init();
    }
  });
})();
