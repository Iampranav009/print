const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://himmer.in";

export function orgSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HIMMER",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@himmer.in",
      contactType: "customer support",
    },
  };
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
