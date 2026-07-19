import { LANGUAGES } from '../../i18n/translations';
import { useT } from '../../i18n/useT';

/** Compact EN / සිං / தமிழ் language switcher. Drop it into any header or the navbar. */
export default function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div className="inline-flex rounded-md border overflow-hidden text-xs">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`px-2 py-1 ${lang === l.code ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
