import type { IndustryFeature } from '../utils/industryFeatures';
import type { Lang } from '../i18n/translations';

export type UsageModuleId =
  | 'overview'
  | 'rental'
  | 'carwash'
  | 'garage'
  | 'tradein'
  | 'accounting'
  | 'towing'
  | 'crm'
  | 'website';

type LStr = Record<Lang, string>;
type LArr = Record<Lang, string[]>;

export type UsageModuleDef = {
  id: UsageModuleId;
  feature?: IndustryFeature;
  menuPath: string;
  title: LStr;
  short: LStr;
  who: LStr;
  steps: LArr;
  flow: LStr;
  exampleTitle: LStr;
  example: LArr;
  tips?: LArr;
};

export type UsageModuleResolved = {
  id: UsageModuleId;
  feature?: IndustryFeature;
  menuPath: string;
  title: string;
  short: string;
  who: string;
  steps: string[];
  flow: string;
  exampleTitle: string;
  example: string[];
  tips?: string[];
};

const pick = (v: LStr, lang: Lang) => v[lang] || v.en;
const pickArr = (v: LArr, lang: Lang) => v[lang] || v.en;

export function resolveUsageModule(m: UsageModuleDef, lang: Lang): UsageModuleResolved {
  return {
    id: m.id,
    feature: m.feature,
    menuPath: m.menuPath,
    title: pick(m.title, lang),
    short: pick(m.short, lang),
    who: pick(m.who, lang),
    steps: pickArr(m.steps, lang),
    flow: pick(m.flow, lang),
    exampleTitle: pick(m.exampleTitle, lang),
    example: pickArr(m.example, lang),
    tips: m.tips ? pickArr(m.tips, lang) : undefined,
  };
}

/** Client-friendly system usage content (EN / SI / TA). */
export const SYSTEM_USAGE_MODULES: UsageModuleDef[] = [
  {
    id: 'overview',
    menuPath: 'dashboard',
    title: {
      en: 'How SellMate works',
      si: 'SellMate ක්‍රියා කරන ආකාරය',
      ta: 'SellMate எப்படி வேலை செய்கிறது',
    },
    short: {
      en: 'Start here',
      si: 'මෙතැනින් පටන් ගන්න',
      ta: 'இங்கிருந்து தொடங்குங்கள்',
    },
    who: {
      en: 'Every organisation uses Customers plus the modules allowed by their industry.',
      si: 'සෑම ආයතනයක්ම Customers සහ ඔවුන්ගේ industry එකට අවසර ඇති modules භාවිතා කරයි.',
      ta: 'ஒவ்வொரு நிறுவனமும் Customers மற்றும் அந்த industry-க்கு அனுமதிக்கப்பட்ட modules-ஐ பயன்படுத்தும்.',
    },
    steps: {
      en: [
        'Add your shops / branches and staff first.',
        'Add Customers (phone is important for bookings, wash, garage, and website leads).',
        'Open only the modules for your business type (Rental, Car Wash, Garage, Electronics, etc.).',
        'Publish Website / CMS if you want a public site or online requests.',
        'Use Accounting at month-end to record income and expenses.',
      ],
      si: [
        'පළමුව shops / branches සහ staff එකතු කරන්න.',
        'Customers එකතු කරන්න (booking, wash, garage සහ website leads සඳහා දුරකථන අංකය වැදගත්).',
        'ඔබේ ව්‍යාපාර වර්ගයට අදාළ modules පමණක් විවෘත කරන්න (Rental, Car Wash, Garage, Electronics ආදිය).',
        'පොදු වෙබ් අඩවියක් හෝ online ඉල්ලීම් අවශ්‍ය නම් Website / CMS Publish කරන්න.',
        'මාස අවසානයේ ආදායම සහ වියදම් Accounting වලට ඇතුළත් කරන්න.',
      ],
      ta: [
        'முதலில் shops / branches மற்றும் staff-ஐ சேர்க்கவும்.',
        'Customers-ஐ சேர்க்கவும் (booking, wash, garage மற்றும் website leads-க்கு போன் எண் முக்கியம்).',
        'உங்கள் வணிக வகைக்குரிய modules மட்டும் திறக்கவும் (Rental, Car Wash, Garage, Electronics போன்றவை).',
        'பொது இணையதளம் அல்லது online கோரிக்கைகள் வேண்டுமானால் Website / CMS-ஐ Publish செய்யவும்.',
        'மாத இறுதியில் வருமானம் மற்றும் செலவுகளை Accounting-ல் பதிவு செய்யவும்.',
      ],
    },
    flow: {
      en: 'Setup org → Customers → Daily module work → Website leads in CRM → Accounting',
      si: 'Org setup → Customers → දෛනික module වැඩ → Website leads (CRM) → Accounting',
      ta: 'Org setup → Customers → தினசரி module வேலை → Website leads (CRM) → Accounting',
    },
    exampleTitle: {
      en: 'Example organisation',
      si: 'උදාහරණ ආයතනය',
      ta: 'எடுத்துக்காட்டு நிறுவனம்',
    },
    example: {
      en: [
        'Ceylon Drive is a VEHICLE_RENTAL company.',
        'They see Rental, Towing, Appointments, Website, CRM, Accounting.',
        'They do not see Car Wash or Trade-In (those belong to other industries).',
      ],
      si: [
        'Ceylon Drive යනු VEHICLE_RENTAL ආයතනයකි.',
        'ඔවුන්ට Rental, Towing, Appointments, Website, CRM, Accounting පෙනේ.',
        'Car Wash හෝ Trade-In නොපෙනේ (ඒවා වෙනත් industries වලට අයිති).',
      ],
      ta: [
        'Ceylon Drive என்பது VEHICLE_RENTAL நிறுவனம்.',
        'அவர்களுக்கு Rental, Towing, Appointments, Website, CRM, Accounting தெரியும்.',
        'Car Wash அல்லது Trade-In தெரியாது (அவை வேறு industries-க்கு உரியவை).',
      ],
    },
    tips: {
      en: [
        'Industry GENERAL (for demos) unlocks every module.',
        'Staff need the right permissions even if the module appears in the menu.',
      ],
      si: [
        'GENERAL industry (demo සඳහා) සියලු modules unlock කරයි.',
        'Menu එකේ පෙනුනත් staff ට අදාළ permissions අවශ්‍යයි.',
      ],
      ta: [
        'GENERAL industry (demo-க்கு) எல்லா modules-ஐயும் unlock செய்யும்.',
        'Menu-ல் தெரிந்தாலும் staff-க்கு சரியான permissions வேண்டும்.',
      ],
    },
  },
  {
    id: 'rental',
    feature: 'rental',
    menuPath: 'rental',
    title: {
      en: 'Vehicle Rental',
      si: 'වාහන කුලිය',
      ta: 'வாகன வாடகை',
    },
    short: {
      en: 'Fleet and bookings',
      si: 'Fleet සහ bookings',
      ta: 'Fleet மற்றும் bookings',
    },
    who: {
      en: 'Rental desk and fleet managers. Customers can also request bookings on your public website.',
      si: 'Rental desk සහ fleet managers. Customers ට public website එකෙන්ද booking ඉල්ලිය හැක.',
      ta: 'Rental desk மற்றும் fleet managers. Customers பொது இணையதளத்திலும் booking கோரலாம்.',
    },
    steps: {
      en: [
        'Fleet: add vehicles (number plate, make/model, photos, status).',
        'Pricing: create daily rate plans (rate, deposit, included km).',
        'Bookings: New, choose vehicle + customer + dates, Get Quote, then Create.',
        'Confirm the booking, then Check-Out (odometer, fuel, photos, damage marks, signature).',
        'When the car returns: Check-In, then Complete. Send agreement by SMS / WhatsApp / PDF if needed.',
      ],
      si: [
        'Fleet: වාහන එකතු කරන්න (අංක තහඩුව, make/model, ඡායාරූප, status).',
        'Pricing: දිනකට rate plans සාදන්න (ගාස්තුව, deposit, ඇතුළත් km).',
        'Bookings: New, වාහනය + customer + දින තෝරන්න, Get Quote, පසුව Create.',
        'Booking Confirm කරන්න, පසුව Check-Out (odometer, ඉන්ධන, ඡායාරූප, හානි සලකුණු, අත්සන).',
        'වාහනය ආපසු ආවාම: Check-In, පසුව Complete. අවශ්‍ය නම් SMS / WhatsApp / PDF එවන්න.',
      ],
      ta: [
        'Fleet: வாகனங்களை சேர்க்கவும் (எண் தகடு, make/model, புகைப்படங்கள், status).',
        'Pricing: தினசரி rate plans உருவாக்கவும் (கட்டணம், deposit, உள்ளடக்கிய km).',
        'Bookings: New, வாகனம் + customer + தேதிகள் தேர்வு, Get Quote, பிறகு Create.',
        'Booking-ஐ Confirm செய்து Check-Out செய்யவும் (odometer, எரிபொருள், புகைப்படங்கள், சேத குறிகள், கையொப்பம்).',
        'வாகனம் திரும்பியதும்: Check-In, பிறகு Complete. தேவைப்பட்டால் SMS / WhatsApp / PDF அனுப்பவும்.',
      ],
    },
    flow: {
      en: 'PENDING → CONFIRMED → CHECKED OUT → RETURNED → COMPLETED',
      si: 'PENDING → CONFIRMED → CHECKED OUT → RETURNED → COMPLETED',
      ta: 'PENDING → CONFIRMED → CHECKED OUT → RETURNED → COMPLETED',
    },
    exampleTitle: {
      en: 'Example: weekend Aqua hire',
      si: 'උදාහරණය: සති අන්ත Aqua කුලිය',
      ta: 'எடுத்துக்காட்டு: வார இறுதி Aqua வாடகை',
    },
    example: {
      en: [
        'Vehicle: Toyota Aqua CAB-4521, LKR 8,500 per day, deposit LKR 25,000.',
        'Customer: Kasun (077-1234567) books Friday to Sunday.',
        'Desk confirms, checks out with full tank at 42,100 km.',
        'Sunday check-in at 42,340 km, extra km fee from the rate plan, then Complete.',
        'Online: customer used the public fleet page; the same booking appeared as PENDING for the desk.',
      ],
      si: [
        'වාහනය: Toyota Aqua CAB-4521, දිනකට LKR 8,500, deposit LKR 25,000.',
        'Customer: Kasun (077-1234567) සිකුරාදා සිට ඉරිදා දක්වා book කරයි.',
        'Desk Confirm කර full tank සහ 42,100 km දී Check-Out කරයි.',
        'ඉරිදා 42,340 km දී Check-In, rate plan අනුව අතිරේක km ගාස්තුව, පසුව Complete.',
        'Online: customer public fleet පිටුව භාවිතා කළා; එම booking desk එකට PENDING ලෙස පෙනුණා.',
      ],
      ta: [
        'வாகனம்: Toyota Aqua CAB-4521, ஒரு நாளைக்கு LKR 8,500, deposit LKR 25,000.',
        'Customer: Kasun (077-1234567) வெள்ளி முதல் ஞாயிறு வரை book செய்கிறார்.',
        'Desk Confirm செய்து full tank மற்றும் 42,100 km-ல் Check-Out செய்கிறது.',
        'ஞாயிறு 42,340 km-ல் Check-In, rate plan படி கூடுதல் km கட்டணம், பிறகு Complete.',
        'Online: customer பொது fleet பக்கத்தை பயன்படுத்தினார்; அதே booking desk-க்கு PENDING ஆக தெரிந்தது.',
      ],
    },
    tips: {
      en: [
        'Public fleet works only after Website CMS is Published.',
        'Loan vehicles can be marked for garage customers waiting for repairs.',
      ],
      si: [
        'Website CMS Publish කළ පසු පමණක් public fleet වැඩ කරයි.',
        'අලුත්වැඩියාව බලා සිටින garage customers සඳහා loan vehicles mark කළ හැක.',
      ],
      ta: [
        'Website CMS Publish செய்த பிறகுதான் public fleet வேலை செய்யும்.',
        'பழுதுபார்ப்புக்கு காத்திருக்கும் garage customers-க்கு loan vehicles mark செய்யலாம்.',
      ],
    },
  },
  {
    id: 'carwash',
    feature: 'carwash',
    menuPath: 'carwash',
    title: {
      en: 'Car Wash',
      si: 'කාර් වොෂ්',
      ta: 'கார் வாஷ்',
    },
    short: {
      en: 'Queue and memberships',
      si: 'Queue සහ memberships',
      ta: 'Queue மற்றும் memberships',
    },
    who: {
      en: 'Wash desk, washers, and managers. Customers may book times via Appointments.',
      si: 'Wash desk, washers සහ managers. Customers Appointments මගින් වේලාවක් book කළ හැක.',
      ta: 'Wash desk, washers மற்றும் managers. Customers Appointments மூலம் நேரம் book செய்யலாம்.',
    },
    steps: {
      en: [
        'Services: create packages (name, price, duration).',
        'Memberships: sell packs (e.g. 10 washes per month) linked to a customer.',
        'Queue: new ticket with plate + customer + service, then assign bay / staff.',
        'Mark in progress, then completed. Membership visit count goes down when used.',
        'Performance: see how many cars each staff member finished.',
      ],
      si: [
        'Services: packages සාදන්න (නම, මිල, කාලය).',
        'Memberships: customer කෙනෙකුට packs විකුණන්න (උදා: මසකට washes 10).',
        'Queue: plate + customer + service සමඟ නව ticket එකක්, පසුව bay / staff assign කරන්න.',
        'In progress ලෙස mark කර, පසුව completed. Membership භාවිතයේදී ඉතිරි washes අඩු වේ.',
        'Performance: එක් එක් staff කීයක් අවසන් කළේදැයි බලන්න.',
      ],
      ta: [
        'Services: packages உருவாக்கவும் (பெயர், விலை, காலம்).',
        'Memberships: customer-க்கு packs விற்கவும் (எ.கா: மாதத்திற்கு 10 washes).',
        'Queue: plate + customer + service உடன் புதிய ticket, பிறகு bay / staff assign செய்யவும்.',
        'In progress என mark செய்து, பிறகு completed. Membership பயன்படுத்தும்போது மீதமுள்ள washes குறையும்.',
        'Performance: ஒவ்வொரு staff எத்தனை கார்கள் முடித்தார்கள் என பார்க்கவும்.',
      ],
    },
    flow: {
      en: 'Queued → In progress → Completed',
      si: 'Queued → In progress → Completed',
      ta: 'Queued → In progress → Completed',
    },
    exampleTitle: {
      en: 'Example: Sparkle Auto Spa',
      si: 'උදාහරණය: Sparkle Auto Spa',
      ta: 'எடுத்துக்காட்டு: Sparkle Auto Spa',
    },
    example: {
      en: [
        'Service: Exterior + Interior, LKR 3,500 (45 minutes).',
        'Member Dilani books Saturday 11:00 via Appointments.',
        'Ticket appears on Queue, assigned to Ruwan, then completed.',
        'Her membership drops from 7 to 6 remaining washes.',
      ],
      si: [
        'Service: Exterior + Interior, LKR 3,500 (මිනිත්තු 45).',
        'Member Dilani Appointments මගින් සෙනසුරාදා 11:00 book කරයි.',
        'Ticket Queue එකේ පෙනේ, Ruwanට assign වේ, පසුව completed.',
        'ඇගේ membership 7 සිට 6 දක්වා අඩු වේ.',
      ],
      ta: [
        'Service: Exterior + Interior, LKR 3,500 (45 நிமிடங்கள்).',
        'Member Dilani Appointments மூலம் சனி 11:00 book செய்கிறார்.',
        'Ticket Queue-ல் தெரியும், Ruwan-க்கு assign ஆகி, பிறகு completed.',
        'அவரது membership 7-இல் இருந்து 6-க்கு குறையும்.',
      ],
    },
  },
  {
    id: 'garage',
    feature: 'garage',
    menuPath: 'garage',
    title: {
      en: 'Garage / Workshop',
      si: 'ගැරාජ් / වැඩමුළුව',
      ta: 'கேரேஜ் / பட்டறை',
    },
    short: {
      en: 'Estimates and repairs',
      si: 'Estimates සහ අලුත්වැඩියා',
      ta: 'Estimates மற்றும் பழுதுபார்ப்பு',
    },
    who: {
      en: 'Service advisors and technicians. Customers approve estimates on a secure link (no login).',
      si: 'Service advisors සහ technicians. Customers secure link එකකින් estimate approve කරයි (login අවශ්‍ය නැත).',
      ta: 'Service advisors மற்றும் technicians. Customers secure link மூலம் estimate approve செய்கிறார்கள் (login தேவையில்லை).',
    },
    steps: {
      en: [
        'Vehicles: register the customer car (plate, make/model, owner).',
        'Estimates: add labour + parts lines, then send approval link (SMS / WhatsApp).',
        'Customer opens the link and chooses Approve or Reject.',
        'If approved, continue on Job Sheets / Parts (when those modules are enabled).',
        'Reminders: set next service by km or date.',
      ],
      si: [
        'Vehicles: customerගේ වාහනය register කරන්න (plate, make/model, හිමිකරු).',
        'Estimates: labour + parts එකතු කර approval link යවන්න (SMS / WhatsApp).',
        'Customer link විවෘත කර Approve හෝ Reject තෝරයි.',
        'Approve වුණොත් Job Sheets / Parts වෙත යන්න (එම modules තිබේ නම්).',
        'Reminders: ඊළඟ service km හෝ දිනය අනුව සකසන්න.',
      ],
      ta: [
        'Vehicles: customer வாகனத்தை register செய்யவும் (plate, make/model, உரிமையாளர்).',
        'Estimates: labour + parts சேர்த்து approval link அனுப்பவும் (SMS / WhatsApp).',
        'Customer link திறந்து Approve அல்லது Reject தேர்வு செய்கிறார்.',
        'Approve ஆனால் Job Sheets / Parts-க்கு செல்லவும் (அந்த modules இருந்தால்).',
        'Reminders: அடுத்த service-ஐ km அல்லது தேதி அடிப்படையில் அமைக்கவும்.',
      ],
    },
    flow: {
      en: 'Estimate → Customer approve → Job / parts → Reminder',
      si: 'Estimate → Customer approve → Job / parts → Reminder',
      ta: 'Estimate → Customer approve → Job / parts → Reminder',
    },
    exampleTitle: {
      en: 'Example: Lanka Motors (Kandy)',
      si: 'උදාහරණය: Lanka Motors (මහනුවර)',
      ta: 'எடுத்துக்காட்டு: Lanka Motors (கண்டி)',
    },
    example: {
      en: [
        'Honda Vezel WP CAB-8890 needs brake pads.',
        'Estimate: parts LKR 12,000 + labour LKR 4,500.',
        'Owner Nimal approves on WhatsApp link.',
        'Job sheet opens, parts taken from stock, reminder set for 5,000 km / 6 months.',
        'While waiting he drives a loan Aqua from Rental.',
      ],
      si: [
        'Honda Vezel WP CAB-8890 ට brake pads අවශ්‍යයි.',
        'Estimate: parts LKR 12,000 + labour LKR 4,500.',
        'හිමිකරු Nimal WhatsApp link එකෙන් approve කරයි.',
        'Job sheet විවෘත වේ, stock එකෙන් parts ගනී, 5,000 km / මාස 6 reminder සැකසේ.',
        'බලා සිටින අතර Rental එකෙන් loan Aqua එකක් පදවයි.',
      ],
      ta: [
        'Honda Vezel WP CAB-8890-க்கு brake pads தேவை.',
        'Estimate: parts LKR 12,000 + labour LKR 4,500.',
        'உரிமையாளர் Nimal WhatsApp link மூலம் approve செய்கிறார்.',
        'Job sheet திறக்கும், stock-இல் இருந்து parts எடுக்கப்படும், 5,000 km / 6 மாத reminder அமையும்.',
        'காத்திருக்கும்போது Rental-இல் இருந்து loan Aqua ஓட்டுகிறார்.',
      ],
    },
  },
  {
    id: 'tradein',
    feature: 'tradein',
    menuPath: 'trade-ins',
    title: {
      en: 'Trade-In / Buyback',
      si: 'Trade-In / Buyback',
      ta: 'Trade-In / Buyback',
    },
    short: {
      en: 'Device offers',
      si: 'උපකරණ ඇගයුම්',
      ta: 'சாதன மதிப்பீடுகள்',
    },
    who: {
      en: 'Electronics sales desk. Used when a customer trades an old phone toward a new one.',
      si: 'Electronics sales desk. පැරණි දුරකථනයක් නව එකක් සඳහා trade කරන විට භාවිතා වේ.',
      ta: 'Electronics sales desk. பழைய போனை புதியதற்கு trade செய்யும்போது பயன்படும்.',
    },
    steps: {
      en: [
        'Price Rules: set offers by brand / model / condition.',
        'Trade-Ins: assess the device, then the system shows the offer.',
        'Accept: credit toward a new sale and/or cash payout.',
        'Optionally put the old device into used stock for resale.',
      ],
      si: [
        'Price Rules: brand / model / condition අනුව offers සකසන්න.',
        'Trade-Ins: උපකරණය පරීක්ෂා කරන්න, පසුව system එක offer පෙන්වයි.',
        'Accept: නව විකුණුමකට credit සහ/හෝ මුදල් ගෙවීම.',
        'අවශ්‍ය නම් පැරණි උපකරණය used stock එකට දමන්න.',
      ],
      ta: [
        'Price Rules: brand / model / condition அடிப்படையில் offers அமைக்கவும்.',
        'Trade-Ins: சாதனத்தை மதிப்பிடவும், பிறகு system offer காட்டும்.',
        'Accept: புதிய விற்பனைக்கு credit மற்றும்/அல்லது பணம்.',
        'தேவைப்பட்டால் பழைய சாதனத்தை used stock-ல் வைக்கவும்.',
      ],
    },
    flow: {
      en: 'Rule → Assess → Offer → Accept / Reject',
      si: 'Rule → Assess → Offer → Accept / Reject',
      ta: 'Rule → Assess → Offer → Accept / Reject',
    },
    exampleTitle: {
      en: 'Example: Gadget Hub (Pettah)',
      si: 'උදාහරණය: Gadget Hub (පැත්ත)',
      ta: 'எடுத்துக்காட்டு: Gadget Hub (பெத்தா)',
    },
    example: {
      en: [
        'Rule: iPhone 12 128GB Good condition = LKR 85,000.',
        'Customer buys a new phone at LKR 185,000.',
        'Trade-in credit applied, pays LKR 100,000 difference.',
        'Old iPhone goes into used inventory.',
      ],
      si: [
        'Rule: iPhone 12 128GB Good = LKR 85,000.',
        'Customer නව දුරකථනයක් LKR 185,000 ට මිලදී ගනී.',
        'Trade-in credit යොදා, වෙනස LKR 100,000 ගෙවයි.',
        'පැරණි iPhone used inventory එකට යයි.',
      ],
      ta: [
        'Rule: iPhone 12 128GB Good = LKR 85,000.',
        'Customer புதிய போனை LKR 185,000-க்கு வாங்குகிறார்.',
        'Trade-in credit பயன்படுத்தி, வித்தியாசம் LKR 100,000 செலுத்துகிறார்.',
        'பழைய iPhone used inventory-க்கு செல்கிறது.',
      ],
    },
  },
  {
    id: 'accounting',
    feature: 'accounting',
    menuPath: 'accounting',
    title: {
      en: 'Accounting',
      si: 'ගිණුම්කරණය',
      ta: 'கணக்கியல்',
    },
    short: {
      en: 'Books and reports',
      si: 'ගිණුම් සහ වාර්තා',
      ta: 'கணக்குகள் மற்றும் அறிக்கைகள்',
    },
    who: {
      en: 'Finance / owners. Available for every industry.',
      si: 'Finance / හිමිකරුවන්. සෑම industry එකකටම තිබේ.',
      ta: 'Finance / உரிமையாளர்கள். எல்லா industries-க்கும் கிடைக்கும்.',
    },
    steps: {
      en: [
        'Chart of Accounts: set up Bank, Revenue, Expense accounts.',
        'Journal Entries: post balanced debit / credit lines with a date and memo.',
        'Reports: review the period (income vs expenses).',
      ],
      si: [
        'Chart of Accounts: Bank, Revenue, Expense ගිණුම් සකසන්න.',
        'Journal Entries: දිනය සහ memo සමඟ balanced debit / credit පළ කරන්න.',
        'Reports: කාල සීමාව සමාලෝචනය කරන්න (ආදායම vs වියදම්).',
      ],
      ta: [
        'Chart of Accounts: Bank, Revenue, Expense கணக்குகளை அமைக்கவும்.',
        'Journal Entries: தேதி மற்றும் memo உடன் balanced debit / credit பதிவு செய்யவும்.',
        'Reports: காலத்தை பரிசீலிக்கவும் (வருமானம் vs செலவுகள்).',
      ],
    },
    flow: {
      en: 'Accounts → Journals → Reports',
      si: 'Accounts → Journals → Reports',
      ta: 'Accounts → Journals → Reports',
    },
    exampleTitle: {
      en: 'Example: rental day income',
      si: 'උදාහරණය: rental දින ආදායම',
      ta: 'எடுத்துக்காட்டு: rental நாள் வருமானம்',
    },
    example: {
      en: [
        'Banked LKR 25,500 from completed rentals.',
        'Journal: Debit Bank 25,500 / Credit Rental Revenue 25,500.',
        'Fuel spend LKR 8,200: Debit Fuel Expense / Credit Bank.',
        'Month-end Reports show rental income against fuel cost.',
      ],
      si: [
        'සම්පූර්ණ වූ rentals වලින් LKR 25,500 bank කළා.',
        'Journal: Debit Bank 25,500 / Credit Rental Revenue 25,500.',
        'ඉන්ධන වියදම LKR 8,200: Debit Fuel Expense / Credit Bank.',
        'මාස අවසාන Reports වල rental ආදායම සහ ඉන්ධන පිරිවැය පෙනේ.',
      ],
      ta: [
        'முடிந்த rentals-இல் இருந்து LKR 25,500 bank செய்யப்பட்டது.',
        'Journal: Debit Bank 25,500 / Credit Rental Revenue 25,500.',
        'எரிபொருள் செலவு LKR 8,200: Debit Fuel Expense / Credit Bank.',
        'மாத இறுதி Reports-ல் rental வருமானம் மற்றும் எரிபொருள் செலவு தெரியும்.',
      ],
    },
    tips: {
      en: [
        'Accounting does not replace POS or rental screens. You post summaries into the ledger.',
      ],
      si: [
        'Accounting මගින් POS හෝ rental තිර ප්‍රතිස්ථාපනය නොවේ. සාරාංශ ledger එකට පළ කරන්න.',
      ],
      ta: [
        'Accounting POS அல்லது rental திரைகளை மாற்றாது. சுருக்கங்களை ledger-ல் பதிவு செய்யுங்கள்.',
      ],
    },
  },
  {
    id: 'towing',
    feature: 'towing',
    menuPath: 'towing',
    title: {
      en: 'Towing / Roadside',
      si: 'රිය ඇදීම / මාර්ග සහාය',
      ta: 'இழுவை / சாலை உதவி',
    },
    short: {
      en: 'SOS and dispatch',
      si: 'SOS සහ dispatch',
      ta: 'SOS மற்றும் dispatch',
    },
    who: {
      en: 'Dispatchers and drivers. Public can send an SOS without logging in.',
      si: 'Dispatchers සහ drivers. Public ට login නැතිවත් SOS යැවිය හැක.',
      ta: 'Dispatchers மற்றும் drivers. Public login இல்லாமலே SOS அனுப்பலாம்.',
    },
    steps: {
      en: [
        'Create a towing request (or receive a public SOS) with phone, vehicle, and location.',
        'Dispatch a truck and update status as the driver moves.',
        'Complete the job and record the fee.',
        'If the car needs repair, open a Garage estimate for the same customer.',
      ],
      si: [
        'දුරකථනය, වාහනය සහ location සමඟ towing request සාදන්න (හෝ public SOS ලබා ගන්න).',
        'Truck එකක් dispatch කර driver ගමන් කරන විට status update කරන්න.',
        'Job අවසන් කර ගාස්තුව වාර්තා කරන්න.',
        'අලුත්වැඩියාව අවශ්‍ය නම් එම customerට Garage estimate එකක් විවෘත කරන්න.',
      ],
      ta: [
        'போன், வாகனம் மற்றும் location உடன் towing request உருவாக்கவும் (அல்லது public SOS பெறவும்).',
        'Truck-ஐ dispatch செய்து driver நகரும்போது status update செய்யவும்.',
        'Job முடித்து கட்டணத்தை பதிவு செய்யவும்.',
        'பழுதுபார்ப்பு தேவைப்பட்டால் அதே customer-க்கு Garage estimate திறக்கவும்.',
      ],
    },
    flow: {
      en: 'Request → Dispatched → On scene → Completed',
      si: 'Request → Dispatched → On scene → Completed',
      ta: 'Request → Dispatched → On scene → Completed',
    },
    exampleTitle: {
      en: 'Example: breakdown on the A9',
      si: 'උදාහරණය: A9 මාර්ගයේ කැඩීමක්',
      ta: 'எடுத்துக்காட்டு: A9 சாலையில் பழுது',
    },
    example: {
      en: [
        'Tourist Axio breaks down near Matale.',
        'Public SOS with GPS pin arrives in Towing.',
        'Flatbed delivers the car to the Kandy workshop.',
        'Garage opens an estimate; optional loan car from Rental.',
      ],
      si: [
        'සංචාරක Axio එකක් මාතලේ අසල කැඩේ.',
        'GPS pin සහිත public SOS Towing වෙත එයි.',
        'Flatbed මගින් මහනුවර workshop එකට ගෙන යයි.',
        'Garage estimate විවෘත කරයි; අවශ්‍ය නම් Rental එකෙන් loan car.',
      ],
      ta: [
        'சுற்றுலா Axio மாத்தளை அருகே பழுதாகிறது.',
        'GPS pin உடன் public SOS Towing-க்கு வரும்.',
        'Flatbed கண்டி workshop-க்கு வாகனத்தை கொண்டு செல்லும்.',
        'Garage estimate திறக்கும்; தேவைப்பட்டால் Rental-இல் இருந்து loan car.',
      ],
    },
  },
  {
    id: 'crm',
    menuPath: 'crm-tasks',
    title: {
      en: 'CRM Tasks',
      si: 'CRM කාර්යයන්',
      ta: 'CRM பணிகள்',
    },
    short: {
      en: 'Follow-ups and leads',
      si: 'පසු විපරම් සහ leads',
      ta: 'பின்தொடர்தல் மற்றும் leads',
    },
    who: {
      en: 'Anyone who follows up customers. Website forms create tasks automatically.',
      si: 'Customers අනුගමනය කරන ඕනෑම කෙනෙකු. Website forms ස්වයංක්‍රීයව tasks සාදයි.',
      ta: 'Customers-ஐ பின்தொடரும் எவரும். Website forms தானாக tasks உருவாக்கும்.',
    },
    steps: {
      en: [
        'Open CRM Tasks to see open follow-ups.',
        'Create a task manually when you need a reminder.',
        'Website contact form creates task type WEBSITE_LEAD.',
        'Online shop order request creates WEBSITE_ORDER (stock is not reduced until you confirm a real sale).',
        'Call the customer, convert to booking / sale / appointment, then mark the task done.',
      ],
      si: [
        'විවෘත follow-ups බැලීමට CRM Tasks විවෘත කරන්න.',
        'Reminder අවශ්‍ය නම් task එකක් අතින් සාදන්න.',
        'Website contact form මගින් WEBSITE_LEAD task එකක් එයි.',
        'Online shop order request මගින් WEBSITE_ORDER එයි (සැබෑ විකුණුමක් Confirm කරන තුරු stock අඩු නොවේ).',
        'Customerට call කර booking / sale / appointment බවට පත් කර, task done කරන්න.',
      ],
      ta: [
        'திறந்த follow-ups பார்க்க CRM Tasks திறக்கவும்.',
        'Reminder தேவைப்பட்டால் task-ஐ கைமுறையாக உருவாக்கவும்.',
        'Website contact form WEBSITE_LEAD task உருவாக்கும்.',
        'Online shop order request WEBSITE_ORDER உருவாக்கும் (உண்மையான விற்பனையை Confirm செய்யும் வரை stock குறையாது).',
        'Customer-ஐ அழைத்து booking / sale / appointment ஆக்கி, task-ஐ done செய்யவும்.',
      ],
    },
    flow: {
      en: 'Lead / order arrives → Call → Convert in the right module → Close task',
      si: 'Lead / order එයි → Call → නිවැරදි module එකට convert → Task වසන්න',
      ta: 'Lead / order வரும் → Call → சரியான module-க்கு convert → Task மூடு',
    },
    exampleTitle: {
      en: 'Example: wedding van enquiry',
      si: 'උදාහරණය: මංගල වෑන් විමසුම',
      ta: 'எடுத்துக்காட்டு: திருமண வேன் கேள்வி',
    },
    example: {
      en: [
        'Website message: "Need a van for a wedding in Galle, 12 Aug."',
        'CRM shows: Website lead: Samanthi Fernando.',
        'Desk calls, creates a Rental booking for that weekend, closes the task.',
      ],
      si: [
        'Website පණිවිඩය: "ගාල්ලේ මංගල්‍යයකට වෑන් එකක් අවශ්‍යයි, අගෝස්තු 12."',
        'CRM පෙන්වයි: Website lead: Samanthi Fernando.',
        'Desk call කර එම සති අන්තයට Rental booking සාදා task වසයි.',
      ],
      ta: [
        'Website செய்தி: "காலியில் திருமணத்திற்கு வேன் தேவை, ஆகஸ்ட் 12."',
        'CRM காட்டும்: Website lead: Samanthi Fernando.',
        'Desk அழைத்து அந்த வார இறுதிக்கு Rental booking உருவாக்கி task மூடும்.',
      ],
    },
  },
  {
    id: 'website',
    menuPath: 'website',
    title: {
      en: 'Website / CMS',
      si: 'වෙබ් අඩවිය / CMS',
      ta: 'இணையதளம் / CMS',
    },
    short: {
      en: 'Public site',
      si: 'පොදු අඩවිය',
      ta: 'பொது இணையதளம்',
    },
    who: {
      en: 'Marketing / owners who run the public website.',
      si: 'පොදු වෙබ් අඩවිය පවත්වන Marketing / හිමිකරුවන්.',
      ta: 'பொது இணையதளத்தை நடத்தும் Marketing / உரிமையாளர்கள்.',
    },
    steps: {
      en: [
        'Site Settings: title, about, phone, colours, logo, hero image.',
        'Pages / Blog / Testimonials: add content.',
        'Tick Publish website, then open View live site.',
        'Rental public site and shop site both read this content (filtered by your organisation).',
      ],
      si: [
        'Site Settings: title, about, දුරකථනය, වර්ණ, logo, hero රූපය.',
        'Pages / Blog / Testimonials: අන්තර්ගතය එකතු කරන්න.',
        'Publish website tick කර, View live site විවෘත කරන්න.',
        'Rental public site සහ shop site දෙකම මෙම අන්තර්ගතය කියවයි (ඔබේ ආයතනය අනුව පමණි).',
      ],
      ta: [
        'Site Settings: title, about, போன், நிறங்கள், logo, hero படம்.',
        'Pages / Blog / Testimonials: உள்ளடக்கத்தை சேர்க்கவும்.',
        'Publish website tick செய்து View live site திறக்கவும்.',
        'Rental public site மற்றும் shop site இரண்டும் இந்த உள்ளடக்கத்தை படிக்கும் (உங்கள் நிறுவனத்திற்கு மட்டும்).',
      ],
    },
    flow: {
      en: 'Edit content → Publish → Public site goes live',
      si: 'අන්තර්ගතය edit → Publish → පොදු අඩවිය live වේ',
      ta: 'உள்ளடக்கம் edit → Publish → பொது இணையதளம் live ஆகும்',
    },
    exampleTitle: {
      en: 'Example: colours and publish',
      si: 'උදාහරණය: වර්ණ සහ publish',
      ta: 'எடுத்துக்காட்டு: நிறங்கள் மற்றும் publish',
    },
    example: {
      en: [
        'Change Primary and Accent colours, then Save.',
        'Publish the site.',
        'Open the live link. Branding updates for your org only; other companies are unchanged.',
      ],
      si: [
        'Primary සහ Accent වර්ණ වෙනස් කර Save කරන්න.',
        'Site එක Publish කරන්න.',
        'Live link විවෘත කරන්න. Branding යාවත්කාලීන වන්නේ ඔබේ ආයතනයට පමණි; අනෙක් සමාගම් නොවෙනස්ව පවතී.',
      ],
      ta: [
        'Primary மற்றும் Accent நிறங்களை மாற்றி Save செய்யவும்.',
        'Site-ஐ Publish செய்யவும்.',
        'Live link திறக்கவும். Branding உங்கள் நிறுவனத்திற்கு மட்டும் புதுப்பிக்கப்படும்; மற்ற நிறுவனங்கள் மாறாது.',
      ],
    },
    tips: {
      en: [
        'Unpublished sites show "not available" on public pages (including rental fleet).',
        'Shop orders and contact forms create CRM tasks. They do not delete your data.',
      ],
      si: [
        'Publish නොකළ අඩවි public pages වල "not available" පෙන්වයි (rental fleet ඇතුළුව).',
        'Shop orders සහ contact forms CRM tasks සාදයි. ඔබේ දත්ත මකන්නේ නැත.',
      ],
      ta: [
        'Publish செய்யாத தளங்கள் public pages-ல் "not available" காட்டும் (rental fleet உட்பட).',
        'Shop orders மற்றும் contact forms CRM tasks உருவாக்கும். உங்கள் தரவை நீக்காது.',
      ],
    },
  },
];
