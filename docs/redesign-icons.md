# قائمة الأيقونات لإعادة تصميم بازار (نمط iOS)

حُصرت هذه القائمة من الكود في `apps/web/src`: **139 أيقونة** من مكتبة `lucide-react`، و**29 رسماً ثلاثي الأبعاد** في `public/images/floating`، و**لا توجد أي أيقونة للتطبيق** (favicon أو أيقونة شاشة الهاتف).

- عمود **SF Symbol** هو المقابل الأقرب في مكتبة أبل، ويُعتمد مرجعاً للرسم (خط بسماكة Regular أو Semibold، وزوايا دائرية).
- ⚠️ تعني أن المكتبة لا تحتوي مقابلاً مطابقاً، فيلزم رسم الأيقونة خصيصاً.
- ↔️ تعني أن الأيقونة تحتاج نسخة معكوسة للعربية (من اليمين لليسار).
- الرقم بين قوسين هو عدد الملفات التي تستخدم الأيقونة.

---

## ١. أيقونات التطبيق والهوية (غير موجودة، أولوية قصوى)

| # | الأصل | المقاس | ملاحظة |
|---|---|---|---|
| 1 | شعار بازار (رمز فقط) | SVG | يُستخدم داخل مربع بزوايا دائرية بأسلوب iOS |
| 2 | شعار بازار (رمز + اسم) | SVG | نسخة فاتحة ونسخة داكنة |
| 3 | `favicon.ico` / `icon.svg` | ‎16، 32، 48 | تبويب المتصفح |
| 4 | `apple-touch-icon.png` | ‎180×180 | عند إضافة الموقع لشاشة الآيفون |
| 5 | أيقونات PWA | ‎192 و512 + نسخة maskable | |
| 6 | صورة المشاركة `opengraph-image` | ‎1200×630 | عند مشاركة الرابط |
| 7 | أيقونة لوحة الإدارة | SVG | الحالية درع، وتحتاج تمييزاً عن أيقونة التاجر |

---

## ٢. القائمة الجانبية للتاجر (تُرسم داخل مربعات ملوّنة بأسلوب الإعدادات في iOS)

| # | Lucide | SF Symbol | الاستخدام | لون المربع |
|---|---|---|---|---|
| 1 | LayoutDashboard (2) | `square.grid.2x2.fill` | الرئيسية | أزرق |
| 2 | Package (25) | `shippingbox.fill` | منتجاتي | برتقالي |
| 3 | Tag (9) | `tag.fill` | التصنيفات | أخضر |
| 4 | BadgeCheck (5) | `checkmark.seal.fill` | الماركات | نيلي |
| 5 | ShoppingCart (16) | `cart.fill` | الطلبات | أحمر |
| 6 | FilePlus2 (2) | `doc.badge.plus` | طلبات يدوية | رمادي |
| 7 | Clock (9) | `clock.fill` | السلال المتروكة | برتقالي |
| 8 | MessageCircle (9) | `bubble.left.fill` | رسائل العملاء | أخضر |
| 9 | Palette (3) | `paintpalette.fill` | شكل المتجر | بنفسجي |
| 10 | Megaphone (5) | `megaphone.fill` | التسويق | وردي |
| 11 | Percent (2) | `percent` | عروض تلقائية | سماوي |
| 12 | CreditCard (4) | `creditcard.fill` | بطاقات الهدايا / الدفع | نيلي |
| 13 | Settings / Settings2 (3) | `gearshape.fill` | إعدادات المتجر | رمادي |
| 14 | Gift (8) | `gift.fill` | ادعُ واربح / الولاء | وردي |
| 15 | Crown (7) | `crown.fill` | الباقات والترقية | أصفر |

## ٣. القائمة الجانبية للإدارة العليا

| # | Lucide | SF Symbol | الاستخدام |
|---|---|---|---|
| 1 | Users (9) | `person.2.fill` | التجار |
| 2 | Store (17) | `storefront.fill` | المتاجر |
| 3 | BarChart2 / BarChart3 (4) | `chart.bar.fill` | التحليلات |
| 4 | Activity (2) | `waveform.path.ecg` | تتبع التجار |
| 5 | GitCompare (2) | `arrow.left.arrow.right` ↔️ | مقارنة المتاجر |
| 6 | AlertTriangle (9) | `exclamationmark.triangle.fill` | تجار بحاجة متابعة / تحذيرات |
| 7 | Newspaper (5) | `newspaper.fill` | المقالات |
| 8 | ClipboardList (1) | `list.clipboard.fill` | سجل المراقبة |
| 9 | Sparkles (8) | `sparkles` | الذكاء الاصطناعي / مميزات |
| 10 | Code2 (2) | `chevron.left.forwardslash.chevron.right` | إعدادات الويدجت |
| 11 | Globe (4) | `globe` | السوق / النطاق |
| 12 | CalendarCheck (1) | `calendar.badge.checkmark` | الاشتراكات |
| 13 | Shield / ShieldCheck / ShieldOff (9) | `shield.fill` / `checkmark.shield.fill` / `shield.slash` | الإدارة والأمان |

## ٤. التنقّل والأشرطة

| # | Lucide | SF Symbol | الاستخدام |
|---|---|---|---|
| 1 | Menu (1) | `line.3.horizontal` | فتح القائمة |
| 2 | MoreHorizontal (1) | `ellipsis` | زر «المزيد» في شريط التبويب |
| 3 | Home (1) | `house.fill` | الرئيسية في المتجر |
| 4 | Search (12) | `magnifyingglass` | البحث |
| 5 | Bell (1) | `bell` / `bell.badge` | الإشعارات |
| 6 | LogOut (3) | `rectangle.portrait.and.arrow.right` ↔️ | تسجيل الخروج |
| 7 | ChevronLeft / Right (10) | `chevron.left` / `chevron.right` ↔️ | أسهم صفوف القوائم |
| 8 | ChevronUp / Down (11) | `chevron.up` / `chevron.down` | الطيّ والقوائم المنسدلة |
| 9 | ArrowLeft / Right (15) | `arrow.left` / `arrow.right` ↔️ | رجوع / متابعة |
| 10 | ArrowUpDown (1) | `arrow.up.arrow.down` | الترتيب |
| 11 | ExternalLink (1) | `arrow.up.right.square` ↔️ | فتح في نافذة جديدة |

## ٥. الإجراءات

| # | Lucide | SF Symbol | الاستخدام |
|---|---|---|---|
| 1 | Plus (21) | `plus` | إضافة |
| 2 | Minus (9) | `minus` | تقليل الكمية |
| 3 | X (28) | `xmark` | إغلاق / إزالة |
| 4 | Check (15) | `checkmark` | تأكيد |
| 5 | CheckCheck (2) | ⚠️ علامتا صح | «تمت القراءة» في المحادثات |
| 6 | Trash2 (18) | `trash` | حذف |
| 7 | Pencil / PenSquare (8) | `pencil` / `square.and.pencil` | تعديل |
| 8 | Copy (7) | `doc.on.doc` | نسخ الرابط أو الكود |
| 9 | Save (3) | `square.and.arrow.down` | حفظ |
| 10 | Upload (6) | `square.and.arrow.up.on.square` | رفع صورة أو ملف |
| 11 | Download (2) | `arrow.down.circle` | تصدير / تنزيل |
| 12 | Share2 (1) | `square.and.arrow.up` | مشاركة |
| 13 | Send (3) | `paperplane.fill` | إرسال رسالة |
| 14 | RefreshCw (4) | `arrow.clockwise` | تحديث |
| 15 | Undo2 / Redo2 (3) | `arrow.uturn.backward` / `arrow.uturn.forward` ↔️ | تراجع / إعادة |
| 16 | Printer (1) | `printer` | طباعة الفاتورة |
| 17 | QrCode (1) | `qrcode` | رمز QR للمتجر |
| 18 | Eye / EyeOff (25) | `eye` / `eye.slash` | إظهار / إخفاء |
| 19 | Lock (14) | `lock.fill` | ميزة مقفلة / كلمة المرور |
| 20 | Link / Link2 (4) | `link` | الروابط |
| 21 | GripVertical (1) | `line.3.horizontal` | سحب لإعادة الترتيب |
| 22 | SlidersHorizontal (2) | `slider.horizontal.3` | الفلاتر |
| 23 | MousePointerClick (2) | `cursorarrow.click` | النقرات (تحليلات) |
| 24 | Ban (1) | `nosign` | حظر |
| 25 | ToggleLeft / ToggleRight (6) | — | **تُحذف**: تُستبدل بمكوّن مفتاح iOS (UISwitch) |

## ٦. الحالات والتنبيهات

| # | Lucide | SF Symbol | الاستخدام |
|---|---|---|---|
| 1 | Loader2 (33) | — | **تُحذف**: تُستبدل بمؤشر التحميل الدوّار في iOS |
| 2 | CheckCircle / CheckCircle2 (12) | `checkmark.circle.fill` | نجاح |
| 3 | XCircle (7) | `xmark.circle.fill` | فشل / إلغاء |
| 4 | AlertCircle (1) | `exclamationmark.circle.fill` | خطأ |
| 5 | Info (1) | `info.circle` | معلومات |
| 6 | HelpCircle (1) | `questionmark.circle` | مساعدة |
| 7 | Circle (1) | `circle` | خطوة غير مكتملة |
| 8 | Zap (14) | `bolt.fill` | الترقية / PRO |
| 9 | Star / StarOff (10) | `star.fill` / `star.slash` | التقييمات |
| 10 | Heart (4) | `heart` / `heart.fill` | المفضّلة |
| 11 | TrendingUp / TrendingDown (13) | `chart.line.uptrend.xyaxis` / `chart.line.downtrend.xyaxis` | الارتفاع والانخفاض |
| 12 | ArrowUpCircle / ArrowDownCircle (2) | `arrow.up.circle.fill` / `arrow.down.circle.fill` | تغيّر الأرقام |
| 13 | Target (1) | `target` | الأهداف |
| 14 | Rocket (3) | ⚠️ لا يوجد مقابل | انطلاق المتجر / التهيئة |
| 15 | PartyPopper (1) | `party.popper` | تهنئة |
| 16 | Lightbulb (3) | `lightbulb` | نصائح |
| 17 | UserCheck / UserX (2) | `person.fill.checkmark` / `person.fill.xmark` | تفعيل التاجر / إيقافه |
| 18 | User (5) | `person.crop.circle` | الحساب |
| 19 | Handshake (2) | ⚠️ لا يوجد مقابل | الشراكات / المسوّقون بالعمولة |

## ٧. التجارة والمتجر

| # | Lucide | SF Symbol | الاستخدام |
|---|---|---|---|
| 1 | ShoppingBag (15) | `bag.fill` | السلة في المتجر |
| 2 | Truck (7) | `truck.box.fill` | الشحن والتوصيل |
| 3 | DollarSign (7) | `banknote` | الإيرادات (يُفضَّل بدل علامة الدولار لأن العملة دينار) |
| 4 | Phone (4) | `phone.fill` | رقم الهاتف |
| 5 | Mail (9) | `envelope` | البريد |
| 6 | MapPin (2) | `mappin.and.ellipse` | العنوان / المحافظة |
| 7 | Calendar (2) | `calendar` | التاريخ |
| 8 | History (1) | `clock.arrow.circlepath` | المشاهدة مؤخراً |
| 9 | Ruler (2) | `ruler` | دليل المقاسات |
| 10 | Building2 (2) | `building.2.fill` | شعار المتجر الافتراضي |
| 11 | FolderOpen (1) | `folder` | المجلدات |
| 12 | Image / ImageIcon (6) | `photo` | الصور |
| 13 | Video (1) | `video` | الفيديو |
| 14 | Layers (1) | `square.3.layers.3d` | الأقسام في المصمّم |
| 15 | LayoutTemplate / LayoutGrid (3) | `rectangle.3.group` / `square.grid.2x2` | القوالب |
| 16 | BookOpen (1) | `book` | المدوّنة / الأدلة |
| 17 | Smartphone (3) | `iphone` | معاينة الهاتف |
| 18 | Tablet (1) | `ipad` | معاينة اللوحي |
| 19 | Monitor (1) | `desktopcomputer` | معاينة الحاسوب |
| 20 | MonitorSmartphone (1) | `laptopcomputer.and.iphone` | كل الأجهزة |

## ٨. أنواع المتاجر (صفحة التسجيل)

| # | Lucide | SF Symbol | النوع |
|---|---|---|---|
| 1 | Shirt (1) | `tshirt.fill` | أزياء |
| 2 | Gamepad2 (1) | `gamecontroller.fill` | ألعاب وإلكترونيات |
| 3 | Gem (1) | `diamond.fill` | مجوهرات / إكسسوارات |
| 4 | Flower2 (1) | `camera.macro` | تجميل وعناية |
| 5 | UtensilsCrossed (1) | `fork.knife` | مطاعم وأغذية |

## ٩. محرّر النصوص (المقالات ووصف المنتج)

| # | Lucide | SF Symbol |
|---|---|---|
| 1 | Bold | `bold` |
| 2 | Italic | `italic` |
| 3 | List | `list.bullet` |
| 4 | ListOrdered | `list.number` ↔️ |
| 5 | Heading2 / Heading3 | `textformat.size` |
| 6 | Quote | `quote.opening` ↔️ |

## ١٠. شعارات خارجية (لا تُرسم بأسلوب SF، بل بالشعار الرسمي لكل منصة)

| # | الشعار | الاستخدام |
|---|---|---|
| 1 | Instagram (5) | روابط التواصل |
| 2 | Facebook (3) | روابط التواصل |
| 3 | YouTube (2) | روابط التواصل |
| 4 | X / Twitter (2) | روابط التواصل (يُحدَّث لشعار X الجديد) |
| 5 | WhatsApp | زر الطلب عبر واتساب (اللون ‎#25D366 موجود في الكود دون أيقونة موحّدة) |
| 6 | Google | زر الدخول بحساب Google |
| 7 | Snapchat / TikTok | ⚠️ اختياري: اللون ‎#FFFC00 موجود في الكود |

---

## ١١. الرسومات ثلاثية الأبعاد في الصفحة الرئيسية (`public/images/floating`)

أسلوبها الحالي ملوّن ومجسّم ولا يتماشى مع iOS. الخيار الأول إعادة رسمها بأسلوب أيقونات تطبيقات أبل (مربع بزوايا دائرية فيه رمز أبيض)، والخيار الثاني استبدالها بلقطات شاشة حقيقية من التطبيق.

| # | الملف | الميزة التي يمثّلها |
|---|---|---|
| 1 | `dashboard.png` | لوحة التحكم |
| 2 | `cart.png` | السلة |
| 3 | `abandoned.png` | السلال المتروكة |
| 4 | `draftorder.png` | الطلبات اليدوية |
| 5 | `todo.png` | قائمة المهام / التهيئة |
| 6 | `chart.png` | التحليلات |
| 7 | `card.png` | الدفع بالبطاقة |
| 8 | `cash.png` | الدفع عند الاستلام |
| 9 | `coupon.png` | الكوبونات |
| 10 | `gift.png` | بطاقات الهدايا |
| 11 | `loyaltystars.png` | برنامج الولاء |
| 12 | `badge.png` | الشارات / الماركات |
| 13 | `message.png` | الرسائل |
| 14 | `chatnotify.png` | إشعارات المحادثة |
| 15 | `countdown.png` | عدّاد العروض |
| 16 | `Timer.png` | المؤقّت |
| 17 | `compare.png` | مقارنة المنتجات |
| 18 | `recent.png` | المشاهدة مؤخراً |
| 19 | `search.png` | البحث |
| 20 | `filters.png` | الفلاتر |
| 21 | `share.png` | المشاركة |
| 22 | `printer.png` | طباعة الفاتورة |
| 23 | `printerfax.png` | طباعة ملصق الشحن |
| 24 | `settings.png` | الإعدادات |
| 25 | `pencil.png` | التعديل |
| 26 | `Sparkles.png` | الميزات الذكية |
| 27 | `sizeguide.png` | دليل المقاسات |
| 28 | `Ruler.png` | القياسات |
| 29 | `dress.png` | متجر الأزياء (مثال) |
| 30 | `hero-store.png` (خارج المجلد) | صورة الواجهة الرئيسية |

---

## الملخّص

| الفئة | العدد |
|---|---|
| أيقونات التطبيق والهوية | 7 (كلها غير موجودة حالياً) |
| أيقونات واجهة (Lucide) | 139 (نحو 105 بعد دمج المتشابهة وحذف المفاتيح ومؤشر التحميل) |
| بلا مقابل في SF Symbols (تُرسم خصيصاً) | 3: علامتا صح، صاروخ، مصافحة |
| شعارات خارجية | 7 |
| رسومات الصفحة الرئيسية | 30 |

### توصيات
1. **الأولوية القصوى:** أيقونات التطبيق (القسم ١)، لأن الموقع حالياً بلا أيقونة في المتصفح ولا على شاشة الآيفون.
2. **مصدر الأيقونات:** لا يُسمح باستخدام SF Symbols نفسها خارج منصات أبل، فهي مرجع للشكل فقط. البدائل:
   - الإبقاء على Lucide بسماكة خط 2 (لا يحتاج أي تغيير في الكود)؛
   - أو رسم مجموعة خاصة ببازار بأسلوب SF.
3. **الأسهم (↔️):** تُعكس في الواجهة العربية، أما الأيقونات الأخرى فلا تُعكس.
4. **تسمية الملفات:** على نمط `icon-[الاسم]-[الحجم].svg`، بالمقاسات 16 و20 و24 و28 (الأخير لمربعات القائمة الجانبية).
