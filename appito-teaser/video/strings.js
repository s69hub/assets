// Every on-screen string. ZWNJ (نیم‌فاصله) is written as ‌ and the hamza of «ـهٔ» as ٔ,
// so neither can be lost in an edit. Product strings are copied from their sources:
//   appito-landing: PRODUCT.md, lib/features.ts, components/assistant-data.ts,
//                   components/sections/AiDay.tsx, components/demo/ai-day/{moments,bale-moment,voice-kit-moment}.tsx
//   ad 9 storekit:  storekit/shops.json (shop names, products, prices)
//   Design Studio captures (ad 7): the chat's starter «یک طرح تازه برای فروشگاهم بساز» and its receipt.

const Z = '‌';
const H = 'ٔ';

export const S = {
  // hook — customers' DMs
  hook1: `هنوز توی <span class="green">دایرکت</span>`,
  hook2: `می${Z}فروشی؟`,
  dms: [
    'قیمت؟', 'موجوده؟', 'سایز ۳۸ دارین؟', 'قیمت لطفاً', 'ارسال به شیراز دارین؟', 'قیمت؟',
    `رنگ دیگه${Z}ش هست؟`, `کارت${Z}به${Z}کارت کنم؟`, 'قیمت؟؟', 'هنوز موجوده؟', `جواب نمی${Z}دین؟`, 'قیمت؟',
    'عکس بیشتر دارین؟', 'قیمت؟', 'تخفیف دارین؟', 'قیمت؟؟؟',
  ],
  dmFlood: 'قیمت؟',

  // say
  say: 'تو فقط بگو…',

  // one AI (features.ts: «هوش مصنوعی اپیتو: یک گفت‌وگو، همه‌ی کارها»)
  aiName: 'هوش مصنوعی اپیتو',
  oneConv: `یک گفت${Z}وگو، همه${Z}ی کارها`,
  jobs: ['محصول و قیمت', 'طراحی فروشگاه', 'تصویر و بنر', 'وبلاگ و محتوا', 'فروش و سفارش', `نظرها و تنظیمات`],

  // design studio (Studio.tsx headline, the chat's real starter, the receipt)
  studio: 'استودیوی طراحی',
  studioLine: `هر صفحه، هر بخش؛<br>با یک جمله`,
  prompt: 'یک طرح تازه برای فروشگاهم بساز',
  placeholder: 'بنویسید…',
  rangeL1: `برای هر کسب${Z}وکاری،`,
  rangeL2: 'طرحی مخصوص خودش',
  draftL1: `پیش${Z}نویس، بعد انتشار`,
  draftL2: `هر وقت خواستی،<br>منتشرش کن`,
  receipt: `طرح در پیش${Z}نویس ذخیره شد`,
  preview: `پیش${Z}نمایش`,
  publish: 'انتشار',
  published: 'منتشر شد',

  // photo studio (features.ts «استودیو عکس», AiDay «بی‌آنکه کالا بریده شود»)
  photo: 'استودیو عکس',
  photoLine: `پس${Z}زمینه را برمی${Z}دارد`,
  gridL1: `همه${H} عکس${Z}ها هم${Z}اندازه`,
  gridL2: `بی${Z}آنکه کالا بریده شود`,
  before: 'قبل',
  after: 'بعد',

  // bale (moments.tsx, bale-moment.tsx)
  baleTitle1: 'سفارش تازه؟',
  baleTitle2: `از توی بله تأییدش کنید`,
  botName: 'ربات اپیتو',
  inBale: 'در بله',
  now: 'همین الان',
  shopName: `قهوه${Z}خانه`,
  cardToCard: `💳 واریز کارت${Z}به${Z}کارت برای تأیید`,
  order: 'سفارش ۱۱۷۹ · ۲۸۵٬۰۰۰ تومان',
  receiptNote: `رسید فرستاده شده؛ پیش از تأیید آن را با حساب بانکی تطبیق دهید.`,
  confirmPay: 'تأیید واریز',
  reject: 'رد',
  seeReceipt: 'دیدن رسید و سفارش',
  ask: 'تأیید واریز ۲۸۵٬۰۰۰ تومان، سفارش ۱۱۷۹؟',
  yes: 'بله، تأیید',
  cancel: 'انصراف',
  twoTaps: `پول با دو تأیید: اول می${Z}پرسد، بعد انجام می${Z}دهد`,
  bale: 'بله.',
  baleSub: `واریز تأیید شد.`,
  done: `✅ واریز سفارش ۱۱۷۹ تأیید شد — مریم، ۱۱:۲۱`,
  log: `تاریخچه${H} فعالیت${Z}ها، در پنل`,
  logLine: `<b>مریم</b> · واریز کارت${Z}به${Z}کارت سفارش ۱۱۷۹ تأیید شد <span style="color:#6f6c80">(از طریق بله)</span>`,
  fromBale: 'از بله',
  t1120: '۱۱:۲۰',
  t1121: '۱۱:۲۱',

  // products from photos (assistant-data.ts examples/promise; shops.json)
  prodL1: 'محصول و قیمت',
  prodL2: `عکس${Z}ها را بفرستید؛ محصول را می${Z}سازد`,
  prodAsk: `از این عکس${Z}ها محصول بساز`,
  prodTool: `در حال ساخت محصول…`,
  prodToolDone: `۳ محصول آماده شد`,
  approveAll: `همه را تأیید کن`,
  made: `ساخته شد`,
  products: [
    { name: `زعفران رشته${Z}ای`, price: '۱٬۸۵۰٬۰۰۰ تومان', cat: 'زعفران', desc: `رشته${Z}های سرخ و خوش${Z}رنگ، از مزرعه تا آشپزخانه${H} شما`, img: 'assets/shops/saffron-crimson/p1.webp' },
    { name: `گلدان لعاب فیروزه${Z}ای`, price: '۱٬۲۵۰٬۰۰۰ تومان', cat: 'سفال', desc: `سفال دست${Z}ساز لالجین، مستقیم از کارگاه`, img: 'assets/shops/lalejin-turquoise-pottery/p1.webp' },
    { name: `ترمه${H} بته${Z}جقه`, price: '۲٬۷۵۰٬۰۰۰ تومان', cat: 'ترمه', desc: `ترمه${H} دست${Z}باف یزد، هدیه${Z}ای ماندگار`, img: 'assets/shops/yazd-termeh/p1.webp' },
  ],

  // voice kit (voice-kit-moment.tsx)
  kitL1: `کیت انتشار`,
  kitL2: `یک پیام صوتی، یک کمپین کامل`,
  listening: `دارم گوش می${Z}دهم…`,
  transcribing: `در حال تبدیل صدا به متن…`,
  spoken: `برای جشنواره${H} برشت پاییزه یه پست و استوری اینستاگرام آماده کن.`,
  caption: `پاییز که می${Z}رسد، بوی قهوه${H} تازه${Z}برشت هم می${Z}رسد ☕️🍂`,
  tags: ['#قهوه', '#قهوه_تازه', '#برشت_پاییزه', `#قهوه${Z}خانه`, '#اسپرسو'],
  captionLabel: 'کپشن',
  tagsLabel: `هشتگ${Z}ها`,
  storyLabel: 'تصویر استوری',
  copyText: 'کپی متن',
  copied: 'کپی شد',
  sawItems: 'کالاهای کمپین را دیدم',
  fourItems: '۴ مورد',
  madeStory: 'تصویر استوری را ساختم',
  ratio: '۹:۱۶',
  storyText: `جشنواره${H} برشت پاییزه`,

  // wall
  wallTitle: `و کلی امکان دیگه…`,
  tiles: [
    { icon: 'sunrise', l: 'گزارش صبح', s: '۸:۰۰' },
    { icon: 'bot', l: `هوش مصنوعی خرید`, s: 'از من بپرس' },
    { icon: 'search-check', l: `جست${Z}وجو با معنی`, s: 'هدیه برای مادر' },
    { icon: 'undo-2', l: 'برگرداندن', s: 'تا ۲۴ ساعت' },
    { icon: 'brain', l: `حافظه${H} فروشگاه`, s: 'یک بار بگو' },
    { icon: 'scale', l: 'مقایسه با رقبا', s: 'قیمت بازار' },
    { icon: 'shield-check', l: 'میزبانی داخل ایران', s: 'همیشه در دسترس' },
    { icon: 'list', l: 'فید ترب', s: 'خودکار' },
    { icon: 'smartphone', l: 'پنل، اپ گوشی شما', s: 'نصب با یک لمس' },
  ],

  // end card (Hero.tsx)
  end1: ['تو', 'فقط', 'بگو،'],
  end2: `اپیتو می${Z}سازدش`,
  cta: 'ساخت فروشگاه',
  url: 'myappito.com',
};
