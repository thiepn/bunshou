// Only the disposable Vite development fixture can expose unlaunched partners.
export const partnerLinksAvailable = import.meta.env.DEV && import.meta.env.VITE_BUNSHOU_PARTNER_FIXTURE === 'true';
