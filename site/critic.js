(function () {
  'use strict';

  window.GradHub = window.GradHub || {};

  var techWarnings = {
    "Python": "أداء Python قد يكون محدوداً في التطبيقات عالية الحمل — فكر في JIT أو التوزيع",
    "TensorFlow": "TensorFlow ثقيل على الموارد — قد تحتاج إلى GPU وتكون تكاليف التشغيل مرتفعة",
    "PyTorch": "نشر PyTorch في الإنتاج يتطلب خبرة في MLOps وقد يكون معقداً للمبتدئين",
    "React": "React معقد في إدارة الحالة (state) للمشاريع الكبيرة — قد يزيد من وقت التطوير",
    "Node.js": "Node.js وحيد الخيط — قد يعاني تحت الضغط العالي في التطبيقات الحقيقية",
    "MongoDB": "MongoDB قد يسبب مشاكل في التناسق (consistency) للبيانات الحرجة",
    "Docker": "Docker يزيد من تعقيد النشر ويحتاج إلى خبرة في DevOps",
    "Flutter": "Flutter لا يزال محدوداً في دعم بعض المنصات والمكتبات الأصلية",
    "Firebase": "Firebase قد يصبح مكلفاً جداً مع زيادة عدد المستخدمين (pay-as-you-grow)",
    "Kubernetes": "Kubernetes معقد جداً في الإعداد والصيانة — غير مناسب للمشاريع الفردية",
    "Solidity": "Solidity يتطلب تدقيقاً أمنياً دقيقاً — أي خطأ يكلف أموالاً حقيقية",
    "NLP": "نماذج NLP الكبيرة تحتاج موارد ضخمة وبيانات تدريب كثيفة",
    "Unity": "Unity قد يتطلب تراخيص تجارية مكلفة للنشر التجاري",
    "Raspberry Pi": "Raspberry Pi له قدرة معالجة محدودة وقد لا يناسب التطبيقات الواقعية",
    "ESP32": "ESP32 محدود في الذاكرة والمعالجة ويصعب تحديثه عن بعد",
    "AR": "تقنيات AR لا تزال غير ناضجة بشكل كامل ودعم الأجهزة متفاوت",
    "AR Core": "AR Core مدعوم على أندرويد فقط والـ ARKit على iOS — تحتاج تطويرين",
    "Blockchain": "البلوكشين ليس حلاً مثالياً لجميع المشاكل — تأكد من حاجتك الحقيقية له",
    "IoT": "أمان إنترنت الأشياء تحدي كبير — أي ثغرة تكشف شبكتك بالكامل",
    "Apache Spark": "Spark يتطلب بنية تحتية قوية وليس مناسباً للبيانات الصغيرة",
    "Kafka": "إدارة Kafka معقدة وتحتاج إلى خبرة متخصصة في تدفق البيانات",
    "Serverless": "Serverless يحد من التحكم في البنية التحتية وقد يكون مقيداً بالمقدم (vendor lock-in)"
  };

  var categoryWeaknesses = {
    "AI/ML": {
      weak: "تعتمد على جودة وكمية البيانات — بيانات سيئة = نتائج سيئة. أيضاً صعوبة تفسير القرارات (black box)",
      risk: "مخاطرة عالية: النماذج قد لا تصل إلى الدقة المطلوبة في الإنتاج، وقد تظهر تحيزات غير متوقعة",
      message: "قد يكون المشروع طموحاً جداً لمشروع تخرج فردي — يحتاج فريقاً متعدد التخصصات"
    },
    "Web Applications": {
      weak: "سوق التطبيقات الويب مشبع جداً — التميز صعب بدون ميزة تنافسية واضحة",
      risk: "مخاطرة متوسطة: المنافسة شديدة، والتطبيق يحتاج إلى واجهة مستخدم استثنائية",
      message: "التركيز على مشكلة محددة جداً يزيد من فرص النجاح"
    },
    "Mobile Apps": {
      weak: "تطبيقات الجوال تحتاج إلى صيانة مستمرة ودعم منصات متعددة (iOS/Android)",
      risk: "مخاطرة متوسطة: تحديثات نظام التشغيل المتكررة قد تكسر التطبيق",
      message: "النشر على متجر واحد فقط في البداية يقلل التعقيد"
    },
    "Cybersecurity": {
      weak: "الاختبار في بيئة معزولة يختلف عن العالم الحقيقي — الثغرات الجديدة تظهر يومياً",
      risk: "مخاطرة عالية: أي خطأ في التصميم الأمني قد يجعل النظام بأكمله غير آمن",
      message: "يحتاج إلى فهم عميق لأمن المعلومات وليس فقط أدوات جاهزة"
    },
    "Data Science": {
      weak: "النتائج تعتمد كلياً على جودة البيانات — غالباً ما تكون البيانات متسخة أو غير كافية",
      risk: "مخاطرة متوسطة: التنظيف والمعالجة المسبقة تأخذ ٨٠٪ من وقت المشروع",
      message: "الحصول على بيانات حقيقية ونظيفة هو التحدي الأكبر وليس التحليل نفسه"
    },
    "Cloud/DevOps": {
      weak: "تكاليف السحابة قد ترتفع بشكل غير متوقع — خصوصاً مع الخدمات المدارة",
      risk: "مخاطرة عالية: البنية التحتية للسحابة معقدة وتحتاج مراقبة مستمرة",
      message: "تحتاج إلى خبرة في Linux والشبكات بالإضافة إلى البرمجة"
    },
    "Blockchain": {
      weak: "البلوكشين ليس ضرورياً لمعظم التطبيقات — قاعدة بيانات عادية قد تكون أسرع وأرخص",
      risk: "مخاطرة عالية: التكاليف (gas fees) والتوسع (scalability) تحديات كبيرة",
      message: "تأكد أولاً أن المشكلة تحتاج فعلاً إلى بلوكشين وليس مجرد قاعدة بيانات"
    },
    "Game Development": {
      weak: "تطوير الألعاب يستغرق وقتاً طويلاً جداً — قد لا يكتمل في فصل دراسي واحد",
      risk: "مخاطرة عالية: المحتوى (رسوم، صوت، تصميم) يحتاج فريقاً فنياً وليس فقط مبرمجين",
      message: "استخدام أصول جاهزة (assets) يسرع التطوير لكنه يحد من الإبداع"
    },
    "IoT": {
      weak: "الأجهزة محدودة الإمكانيات — المعالجة على الحافة (edge) صعبة والصيانة عن بعد معقدة",
      risk: "مخاطرة عالية: مشاكل الاتصال وفقدان البيانات في البيئات الحقيقية شائعة",
      message: "التكلفة المادية للأجهزة قد تكون مرتفعة — وتحتاج إلى صيانة دورية"
    }
  };

  var specificWeaknesses = {
    AI: [
      "نموذج الذكاء الاصطناعي قد لا يعمم بشكل جيد على بيانات حقيقية غير مرئية — فرق كبير بين الدقة في المختبر والواقع",
      "الاعتماد على API خارجي (زي OpenAI) يجعلك مرتبطاً بمزود واحد وقد تتغير الأسعار أو الشروط",
      "تفسير مخرجات النموذج صعب — إذا أخطأ التشخيص، مين المسؤول؟ الطبيب ولا النظام؟",
      "جمع بيانات تدريب كافية ونظيفة صعب جداً — خصوصاً البيانات الطبية أو المالية"
    ],
    Web: [
      "تحتاج إلى استضافة وتحديثات مستمرة — ليس مجرد موقع ثابت",
      "مشاكل التوافق مع المتصفحات المختلفة قد تزيد من وقت التطوير",
      "أداء التطبيق في ظل الاستخدام الكثيف (high traffic) غير مضمون بدون تحسينات",
      "الأمان في تطبيقات الويب مسؤولية كبيرة — XSS و SQL injection تهديدات حقيقية"
    ],
    Mobile: [
      "التطبيق يحتاج إلى تراخيص ونشر متجري — عملية مراجعة آبل صارمة وتستغرق وقتاً",
      "البطارية والأداء على الأجهزة القديمة تحدٍ كبير",
      "خصوصية المستخدم على الجوال حساسة جداً — قوانين GDPR وبيانات الموقع"
    ],
    Security: [
      "اختبار الاختراق في بيئة معملية لا يضمن الأمان في العالم الحقيقي — الثغرات تتطور",
      "الأدوات الأمنية أحياناً تنتج إنذارات كاذبة (false positives) تغرق الفريق",
      "مواكبة أحدث الثغرات الأمنية تتطلب جهداً يومياً مستمراً"
    ],
    Data: [
      "البيانات المتاحة قد لا تمثل المجتمع المستهدف بشكل عادل — تحيز في العينة",
      "تحليل البيانات بدون فهم سياق المجال (domain knowledge) يعطي استنتاجات سطحية",
      "الخصوصية: التعامل مع بيانات حقيقية له قيود قانونية وأخلاقية كبيرة"
    ],
    Cloud: [
      "vendor lock-in مع AWS/Azure/GCP صعب الخروج منه — تكاليف الترحيل عالية",
      "ضبط الـ autoscaling معقد — قد تدفع فوق ما تحتاج أو تطبيقك يعلق وقت الذروة",
      "المراقبة وال logging تحتاج أدوات إضافية (Datadog/NewRelic) بتكاليف مرتفعة"
    ],
    Blockchain: [
      "العديد من مشاكل البلوكشين تم حلها جزئياً فقط — التوسع (scalability) لا يزال تحدياً",
      "التطبيقات اللامركزية DApps تواجه UX سيئ مقارنة بالتطبيقات التقليدية",
      "التكلفة (gas) على Ethereum قد تجعل التطبيق غير عملي اقتصادياً"
    ],
    Game: [
      "الألعاب ثلاثية الأبعاد تحتاج وقتاً طويلاً في صنع المحتوى — شخص واحد لا يكفي",
      "تحسين الأداء (optimization) لأجهزة مختلفة صعب — خصوصاً في الواقع الافتراضي",
      "تسويق اللعبة والتوزيع تحدي منفصل — لعبة جيدة بدون تسويق لا يراها أحد"
    ],
    IoT: [
      "بروتوكولات IoT المختلفة (MQTT, CoAP, HTTP) غير متوافقة — اختيار البروتوكول الغلط يكسر النظام",
      "تحديث البرامج الثابتة (firmware) للأجهزة المنتشرة أمر صعب ومكلف",
      "البطارية وعمر الجهاز في تطبيقات IoT الميدانية قيد رئيسي"
    ]
  };

  function getCategoryKey(category) {
    if (!category) return "Web";
    var cat = category.toLowerCase();
    if (cat.indexOf("ai") !== -1 || cat.indexOf("ml") !== -1 || cat.indexOf("intelligence") !== -1 || cat.indexOf("machine") !== -1) return "AI";
    if (cat.indexOf("web") !== -1 || cat.indexOf("app") !== -1) return "Web";
    if (cat.indexOf("mobile") !== -1) return "Mobile";
    if (cat.indexOf("cyber") !== -1 || cat.indexOf("security") !== -1) return "Security";
    if (cat.indexOf("data") !== -1) return "Data";
    if (cat.indexOf("cloud") !== -1 || cat.indexOf("devops") !== -1) return "Cloud";
    if (cat.indexOf("blockchain") !== -1) return "Blockchain";
    if (cat.indexOf("game") !== -1) return "Game";
    if (cat.indexOf("iot") !== -1) return "IoT";
    return "Web";
  }

  function getSpecificWeaknesses(project, categoryKey) {
    var list = specificWeaknesses[categoryKey] || specificWeaknesses["Web"];
    var results = [];
    var desc = (project.short_desc_ar || project.description || "").toLowerCase();

    if (desc.indexOf("صورة") !== -1 || desc.indexOf("image") !== -1 || desc.indexOf("vision") !== -1 || desc.indexOf("رؤية") !== -1) {
      if (categoryKey === "AI") {
        results.push("نظم الرؤية الحاسوبية حساسة جداً لظروف الإضاءة وزاوية التصوير — أداء ضعيف خارج المختبر");
      }
    }
    if (desc.indexOf("دواء") !== -1 || desc.indexOf("طبي") !== -1 || desc.indexOf("طب") !== -1 || desc.indexOf("diagnos") !== -1 || desc.indexOf("medical") !== -1) {
      results.push("المجال الطبي يحتاج إلى موافقات تنظيمية (FDA/هيئة الدواء) وتجارب سريرية — غير مناسب لمشروع تخرج قصير");
      results.push("المسؤولية القانونية: نظام طبي خاطئ قد يسبب ضرراً حقيقياً للمرضى");
    }
    if (desc.indexOf("دعم") !== -1 || desc.indexOf("نفس") !== -1 || desc.indexOf("mental") !== -1 || desc.indexOf("health") !== -1) {
      if (categoryKey === "AI") {
        results.push("روبوتات الصحة النفسية تتعامل مع حالات حساسة — خطأ في التصنيف العاطفي قد يضر بالمستخدم");
      }
    }
    if (desc.indexOf("تعليم") !== -1 || desc.indexOf("learning") !== -1 || desc.indexOf("تعلم") !== -1) {
      if (categoryKey === "Web") {
        results.push("منصات التعليم الإلكتروني تواجه منافسة شرسة من Coursera و Udemy — صعب التميز بدون محتوى حصري");
      }
    }

    results.push(list[Math.floor(Math.random() * list.length)]);
    return results.slice(0, 3);
  }

  function getTechWeaknesses(techs) {
    var results = [];
    if (!techs || !techs.length) return ["لم تحدد التقنيات — هذا يقلل من مصداقية الفكرة"];
    techs.forEach(function (t) {
      if (techWarnings[t]) results.push(techWarnings[t]);
    });
    if (techs.length > 4) results.push("عدد التقنيات كبير جداً (٥+) — يزيد من تعقيد المشروع وقد لا يكتمل في الوقت المحدد");
    if (techs.length < 2) results.push("تقنيات قليلة جداً — قد تكون الفكرة بسيطة جداً أو غير محددة بشكل كافٍ");
    return results.slice(0, 4);
  }

  function getSpecificSuggestions(project, categoryKey) {
    var desc = (project.short_desc_ar || project.description || "").toLowerCase();
    var techs = project.technologies || [];
    var suggestions = [];

    if (techs.length > 4) suggestions.push("قلص عدد التقنيات إلى ٣-٤ فقط وركز على إتقانها بدلاً من التشتت");
    if (techs.length < 2) suggestions.push("حدد التقنيات الرئيسية — هذا يساعد في تقدير الجهد المطلوب");
    if (techs.indexOf("Docker") === -1 && techs.length > 2) suggestions.push("استخدم Docker لتوحيد بيئة التطوير وتجنب مشكلة 'اشتغل عندي'");
    if (techs.indexOf("PostgreSQL") === -1 && techs.indexOf("MySQL") === -1) suggestions.push("اختر قاعدة بيانات علائقية (PostgreSQL أو MySQL) بدلاً من NoSQL للبيانات المنظمة");
    if (techs.indexOf("testing") === -1 && techs.indexOf("Jest") === -1 && techs.indexOf("pytest") === -1) suggestions.push("أضف اختبارات (unit tests) من اليوم الأول — لا تترك الاختبارات للنهاية");

    if (desc.indexOf("طبي") !== -1 || desc.indexOf("medical") !== -1) suggestions.push("ركز على مشكلة طبية محددة جداً بدلاً من نظام تشخيص عام — مثلاً: تشخيص مرض واحد فقط");
    if (desc.indexOf("دعم") !== -1 || desc.indexOf("chat") !== -1 || desc.indexOf("نفس") !== -1) suggestions.push("أضفت تنبيهاً واضحاً أن هذا ليس بديلاً عن العلاج المهني — مسؤولية قانونية وأخلاقية");
    if (desc.indexOf("تعليم") !== -1 || desc.indexOf("learn") !== -1) suggestions.push("ركز على تخصص تعليمي ضيق بدلاً من منصة تعليم شاملة — مثلاً: تعلم البرمجة للأطفال فقط");
    if (desc.indexOf("توصية") !== -1 || desc.indexOf("recommend") !== -1) suggestions.push("محركات التوصية تحتاج إلى بيانات مستخدمين كافية — فكر في cold start problem");
    if (desc.indexOf("كشف") !== -1 || desc.indexOf("detect") !== -1 || desc.indexOf("تشخيص") !== -1) suggestions.push("حدد معايير النجاح (معدل الدقة المطلوب) قبل البدء في التطوير");
    if (desc.indexOf("ذكي") !== -1 || desc.indexOf("smart") !== -1 || desc.indexOf("تحليل") !== -1) suggestions.push("حدد المشكلة بدقة: ماذا تقيس؟ كيف تقيس النجاح؟ ما هو خط الأساس؟");
    if (desc.indexOf("تتبع") !== -1 || desc.indexOf("track") !== -1 || desc.indexOf("logistics") !== -1) suggestions.push("تكامل مع APIs خارجية (خرائط، GPS) يضيف تكاليف واعتماد على مزودين خارجيين");

    if (suggestions.length < 2) suggestions.push("حدد الحد الأدنى للمنتج القابل للتطبيق (MVP) وركز على إكماله أولاً");
    if (suggestions.length < 3) suggestions.push("ابحث عن مشاريع مفتوحة المصدر مشابهة — لا تعيد اختراع العجلة");
    if (suggestions.length < 4) suggestions.push("فكر في خطة بديلة (plan B) لأصعب جزء تقني في المشروع");

    return suggestions.slice(0, 5);
  }

  function getFeasibilityScore(project, categoryKey) {
    var score = 7;
    var techs = project.technologies || [];
    var desc = (project.short_desc_ar || project.description || "").length;

    if (techs.length > 5) score -= 2;
    if (techs.length <= 2) score += 1;
    if (desc < 100) score -= 1;
    if (desc > 300) score += 1;

    var hardTechs = ["Kubernetes", "TensorFlow", "PyTorch", "Unreal Engine", "Solidity", "Apache Spark"];
    techs.forEach(function (t) {
      if (hardTechs.indexOf(t) !== -1) score -= 1;
    });

    if (categoryKey === "AI" || categoryKey === "Blockchain" || categoryKey === "Security") score -= 1;
    if (categoryKey === "Web" || categoryKey === "Mobile") score += 1;

    return Math.max(1, Math.min(10, score));
  }

  window.GradHub.Critic = {
    analyze: function (project) {
      var panel = document.getElementById('criticPanel');
      if (!panel) return;

      panel.style.display = 'block';
      panel.innerHTML = '<div class="critic-loading">🔍 جاري تحليل الفكرة...</div>';

      var timerId = setTimeout(function () {
        var panel = document.getElementById('criticPanel');
        if (!panel || panel.innerHTML.indexOf('جاري تحليل') === -1) return;
        var categoryKey = getCategoryKey(project.category);
        var techs = project.technologies || [];

        var techWeak = getTechWeaknesses(techs);
        var specificWeak = getSpecificWeaknesses(project, categoryKey);
        var allWeaknesses = techWeak.concat(specificWeak);

        var suggestions = getSpecificSuggestions(project, categoryKey);
        var feasibility = getFeasibilityScore(project, categoryKey);

        var feasibilityColor = feasibility >= 7 ? "green" : feasibility >= 5 ? "gold" : "red";
        var feasibilityLabel = feasibility >= 7 ? "جيدة" : feasibility >= 5 ? "متوسطة" : "صعبة";

        var html = '<div class="critic-header">';
        html += '<h3>🔍 تحليل الناقض</h3>';
        html += '<div class="critic-score-badge" style="background:' + feasibilityColor + '">';
        html += '<span class="score-num">' + feasibility + '/10</span>';
        html += '<span class="score-label">جدوى: ' + feasibilityLabel + '</span>';
        html += '</div></div>';

        html += '<div class="critic-section">';
        html += '<h4>⚠️ نقاط الضعف والمخاطر</h4>';
        if (allWeaknesses.length) {
          html += '<ul>' + allWeaknesses.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>';
        } else {
          html += '<p class="text-muted">لم يتم تحديد نقاط ضعف واضحة.</p>';
        }
        html += '</div>';

        html += '<div class="critic-section">';
        html += '<h4>💡 اقتراحات تطويرية مخصصة</h4>';
        html += '<ul>' + suggestions.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>';
        html += '</div>';

        html += '<div class="critic-section">';
        html += '<h4>📊 جدوى المشروع: ' + feasibility + '/10</h4>';
        html += '<div class="feasibility-bar"><div class="feasibility-fill" style="width:' + (feasibility * 10) + '%;background:' + feasibilityColor + '"></div></div>';
        html += '<p class="critic-verdict">' + (feasibility >= 8 ? '✅ فكرة قابلة للتنفيذ — أنصح بالمتابعة' : feasibility >= 5 ? '⚠️ فكرة تحتاج تبسيط — ركز على جزء محدد' : '❌ فكرة صعبة التنفيذ حالياً — فكر في تبسيط النطاق') + '</p>';
        html += '</div>';

        panel.innerHTML = html;
      }, 800);
      window.GradHub.criticTimer = timerId;
    }
  };
})();
