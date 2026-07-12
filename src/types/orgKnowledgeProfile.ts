export interface OrgKnowledgeProfile {
  about?: string;
  servicesOffered?: string;
  productsOverview?: string;
  businessHours?: string;
  deliveryInfo?: string;
  policies?: string;
}

export const EMPTY_ORG_KNOWLEDGE: OrgKnowledgeProfile = {
  about: '',
  servicesOffered: '',
  productsOverview: '',
  businessHours: '',
  deliveryInfo: '',
  policies: '',
};

export function normalizeOrgKnowledge(raw: OrgKnowledgeProfile | null | undefined): OrgKnowledgeProfile {
  return {
    about: raw?.about ?? '',
    servicesOffered: raw?.servicesOffered ?? '',
    productsOverview: raw?.productsOverview ?? '',
    businessHours: raw?.businessHours ?? '',
    deliveryInfo: raw?.deliveryInfo ?? '',
    policies: raw?.policies ?? '',
  };
}

export function toOrgKnowledgePayload(profile: OrgKnowledgeProfile): OrgKnowledgeProfile {
  const trim = (v?: string) => v?.trim() || undefined;
  return {
    about: trim(profile.about),
    servicesOffered: trim(profile.servicesOffered),
    productsOverview: trim(profile.productsOverview),
    businessHours: trim(profile.businessHours),
    deliveryInfo: trim(profile.deliveryInfo),
    policies: trim(profile.policies),
  };
}
