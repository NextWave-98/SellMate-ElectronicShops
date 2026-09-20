/** Default editable content slots   shop + rental. Layout/fonts stay fixed on public sites. */

export const DEFAULT_SHOP_CONTENT = {
  hero: {
    label: '✦ Collection',
    headline: 'OUR LATEST\nOFFERINGS',
    ctaSecondary: 'Contact',
    images: [] as string[],
  },
  products: {
    title: 'OUR PRODUCT',
    emptyMessage: 'No products published yet. Add products in SellMate inventory and keep the website published.',
    viewAll: 'View all products',
    filterAll: 'All',
  },
  featured: {
    label: '✦ Featured',
    title: 'PERFECT MATCH',
    stat1Label: 'Collection',
    stat2Value: '24/7',
    stat2Label: 'Order desk',
  },
  recommendations: { title: 'RECOMMENDATION' },
  blog: { title: 'LOOKBOOK', viewMore: 'View more' },
  shop: {
    label: 'Catalogue',
    title: 'OUR PRODUCT',
    emptyMessage: 'No products in this filter.',
  },
  contact: { label: 'Get in touch', title: 'CONTACT' },
  services: { title: 'OUR SERVICES' },
  footer: { tagline: 'BEYOND BOUNDARIES' },
  header: { bagLabel: 'Bag' },
};

export const DEFAULT_RENTAL_CONTENT = {
  hero: {
    pickupLabel: 'Pickup hub',
    panelTitle: 'Car details',
    ctaSecondary: 'Talk to us',
  },
  assistant: {
    title: 'Assistant',
    prompt: 'Arrange to rent with',
    placeholder: 'Ask about rates, drivers, long-term…',
  },
  promo: {
    label: 'Promo pulse',
    title: 'Weekend escape',
    body: 'Book Fri–Sun and unlock complimentary late return.',
    packLabel: 'Featured pack',
    packName: 'City + coast',
    cta: 'Open',
  },
  about: {
    label: 'About',
    title: 'Driven by clarity',
    contactTitle: 'Contact desk',
    contactCta: 'Start a request',
  },
  services: {
    title: 'Services',
    linkLabel: 'See fleet →',
  },
  testimonials: {
    title: 'Drivers love it',
  },
  blog: {
    title: 'Stories & offers',
    viewAll: 'View all →',
  },
  contactCta: {
    badge: 'Ready when you are',
    title: 'Book the next mile',
    body: "Search live availability, send a request, and we'll confirm by phone   usually within the hour.",
    formCta: 'Contact form',
    hoursLabel: 'Desk hours',
    hours: '8:00 – 20:00 daily',
  },
  fleet: {
    label: 'Live fleet',
    title: 'Choose your drive',
    subtitle: 'Pick dates to see live availability for this organisation.',
  },
  contact: {
    label: 'Contact',
    title: "We're on the desk",
    subtitle: 'Call, email, or send a message   we confirm bookings by phone.',
  },
  header: {
    searchPlaceholder: 'Type to search fleet, pages…',
    bookingCta: 'Add booking',
  },
};

/** @deprecated use DEFAULT_SHOP_CONTENT */
export const DEFAULT_CMS_CONTENT = DEFAULT_SHOP_CONTENT;

export const SHOP_SECTIONS = {
  hero: true,
  products: true,
  featured: true,
  services: true,
  blog: true,
  contact: true,
  testimonials: true,
};

export const RENTAL_SECTIONS = {
  hero: true,
  fleet: true,
  about: true,
  services: true,
  testimonials: true,
  blog: true,
  contact: true,
};

export const DEFAULT_SOCIALS = {
  facebook: '',
  instagram: '',
  whatsapp: '',
  tiktok: '',
};

export function isShopIndustry(industryType?: string) {
  return industryType === 'ELECTRONICS' || industryType === 'CLOTHING' || industryType === 'GENERAL';
}

export function isRentalIndustry(industryType?: string) {
  return industryType === 'VEHICLE_RENTAL';
}

export function mergeContentForIndustry(raw: any, industryType?: string) {
  if (isRentalIndustry(industryType)) {
    const c = raw || {};
    return {
      hero: { ...DEFAULT_RENTAL_CONTENT.hero, ...(c.hero || {}) },
      assistant: { ...DEFAULT_RENTAL_CONTENT.assistant, ...(c.assistant || {}) },
      promo: { ...DEFAULT_RENTAL_CONTENT.promo, ...(c.promo || {}) },
      about: { ...DEFAULT_RENTAL_CONTENT.about, ...(c.about || {}) },
      services: { ...DEFAULT_RENTAL_CONTENT.services, ...(c.services || {}) },
      testimonials: { ...DEFAULT_RENTAL_CONTENT.testimonials, ...(c.testimonials || {}) },
      blog: { ...DEFAULT_RENTAL_CONTENT.blog, ...(c.blog || {}) },
      contactCta: { ...DEFAULT_RENTAL_CONTENT.contactCta, ...(c.contactCta || {}) },
      fleet: { ...DEFAULT_RENTAL_CONTENT.fleet, ...(c.fleet || {}) },
      contact: { ...DEFAULT_RENTAL_CONTENT.contact, ...(c.contact || {}) },
      header: { ...DEFAULT_RENTAL_CONTENT.header, ...(c.header || {}) },
    };
  }
  const c = raw || {};
  return {
    hero: { ...DEFAULT_SHOP_CONTENT.hero, ...(c.hero || {}) },
    products: { ...DEFAULT_SHOP_CONTENT.products, ...(c.products || {}) },
    featured: { ...DEFAULT_SHOP_CONTENT.featured, ...(c.featured || {}) },
    recommendations: { ...DEFAULT_SHOP_CONTENT.recommendations, ...(c.recommendations || {}) },
    blog: { ...DEFAULT_SHOP_CONTENT.blog, ...(c.blog || {}) },
    shop: { ...DEFAULT_SHOP_CONTENT.shop, ...(c.shop || {}) },
    contact: { ...DEFAULT_SHOP_CONTENT.contact, ...(c.contact || {}) },
    services: { ...DEFAULT_SHOP_CONTENT.services, ...(c.services || {}) },
    footer: { ...DEFAULT_SHOP_CONTENT.footer, ...(c.footer || {}) },
    header: { ...DEFAULT_SHOP_CONTENT.header, ...(c.header || {}) },
  };
}
