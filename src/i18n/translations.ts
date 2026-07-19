/* Lightweight, dependency-free i18n. Add keys as screens are localized. */
export type Lang = 'en' | 'si' | 'ta';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'si', label: 'සිං' },
  { code: 'ta', label: 'தமிழ்' },
];

export const translations: Record<string, Record<Lang, string>> = {
  appointments: { en: 'Appointments', si: 'හමුවීම්', ta: 'சந்திப்புகள்' },
  towing: { en: 'Towing / Roadside', si: 'රිය ඇදීම', ta: 'இழுவை சேவை' },
  accounting: { en: 'Accounting', si: 'ගිණුම්කරණය', ta: 'கணக்கியல்' },
  crmTasks: { en: 'CRM Tasks & Follow-ups', si: 'කාර්යයන් සහ පසු විපරම්', ta: 'பணிகள் & பின்தொடர்தல்' },
  technicianSkills: { en: 'Technician Skills', si: 'කාර්මික කුසලතා', ta: 'தொழில்நுட்ப திறன்கள்' },
  website: { en: 'Website / CMS', si: 'වෙබ් අඩවිය', ta: 'இணையதளம்' },

  save: { en: 'Save', si: 'සුරකින්න', ta: 'சேமி' },
  cancel: { en: 'Cancel', si: 'අවලංගු', ta: 'ரத்து' },
  create: { en: 'Create', si: 'සාදන්න', ta: 'உருவாக்கு' },
  add: { en: 'Add', si: 'එකතු කරන්න', ta: 'சேர்' },
  delete: { en: 'Delete', si: 'මකන්න', ta: 'நீக்கு' },
  refresh: { en: 'Refresh', si: 'නැවුම් කරන්න', ta: 'புதுப்பி' },
  close: { en: 'Close', si: 'වසන්න', ta: 'மூடு' },
  print: { en: 'Print', si: 'මුද්‍රණය', ta: 'அச்சிடு' },
  status: { en: 'Status', si: 'තත්ත්වය', ta: 'நிலை' },
  customer: { en: 'Customer', si: 'පාරිභෝගිකයා', ta: 'வாடிக்கையாளர்' },
  staff: { en: 'Staff', si: 'කාර්ය මණ්ඩලය', ta: 'பணியாளர்' },
  search: { en: 'Search', si: 'සොයන්න', ta: 'தேடு' },
  newTask: { en: 'New Task', si: 'නව කාර්යය', ta: 'புதிய பணி' },
  newAppointment: { en: 'New Appointment', si: 'නව හමුවීම', ta: 'புதிய சந்திப்பு' },
  newRequest: { en: 'New Request', si: 'නව ඉල්ලීම', ta: 'புதிய கோரிக்கை' },

  systemUsage: { en: 'System Usage', si: 'පද්ධති භාවිතය', ta: 'கணினி பயன்பாடு' },
  usageIntro: {
    en: 'Simple guide for your team. How each part of SellMate works, step by step, with a real example. Tabs only show modules for your industry.',
    si: 'ඔබේ කණ්ඩායමට සරල මාර්ගෝපදේශයක්. SellMate එකේ එක් එක් කොටස ක්‍රියා කරන ආකාරය පියවරෙන් පියවර, උදාහරණයක් සමඟ. ඔබේ industry එකට අදාළ tabs පමණක් පෙනේ.',
    ta: 'உங்கள் குழுவுக்கான எளிய வழிகாட்டி. SellMate-இன் ஒவ்வொரு பகுதியும் எப்படி வேலை செய்கிறது என்பதை படிப்படியாக, உதாரணத்துடன். உங்கள் industry-க்குரிய tabs மட்டும் தெரியும்.',
  },
  usageEmpty: {
    en: 'No usage guides available for this organisation.',
    si: 'මෙම ආයතනයට භාවිත මාර්ගෝපදේශ නැත.',
    ta: 'இந்த நிறுவனத்திற்கு பயன்பாட்டு வழிகாட்டிகள் இல்லை.',
  },
  usageOpenModule: { en: 'Open module', si: 'Module විවෘත කරන්න', ta: 'Module திற' },
  usageWho: { en: 'Who uses this?', si: 'මෙය කවුද භාවිතා කරන්නේ?', ta: 'இதை யார் பயன்படுத்துவார்கள்?' },
  usageFlow: { en: 'Full flow (do this in order)', si: 'සම්පූර්ණ ප්‍රවාහය (මෙම අනුපිළිවෙලින්)', ta: 'முழு ஓட்டம் (இந்த வரிசையில்)' },
  usageStatusPath: { en: 'Status path', si: 'තත්ත්ව මාර්ගය', ta: 'நிலை பாதை' },
  usageTips: { en: 'Tips', si: 'ඉඟි', ta: 'குறிப்புகள்' },
  usageExampleHint: {
    en: 'How it looks in real life. Follow this story while you click the module.',
    si: 'යථාර්ථයේ මෙය පෙනෙන ආකාරය. Module එක click කරන අතර මෙම කතාව අනුගමනය කරන්න.',
    ta: 'நிஜத்தில் இப்படி தெரியும். Module-ஐ click செய்யும்போது இந்த கதையை பின்பற்றவும்.',
  },
};
