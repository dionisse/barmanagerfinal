/**
 * Bouton Support WhatsApp — système wa.me 0€
 * Permet au support d'écrire à un client ou au client de contacter le support
 */
import React from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { getWhatsappLink, getClientToSupportLink, getSupportPhone, WhatsappTemplates } from '../utils/whatsappService';

interface SupportWhatsappButtonProps {
  /** Numéro du client à contacter */
  clientPhone?: string;
  /** Numéro support (si client contacte support) */
  supportPhone?: string;
  /** Message pré-rempli */
  message?: string;
  /** Template prédéfini */
  template?: keyof typeof WhatsappTemplates;
  templateArgs?: any[];
  /** Variante */
  variant?: 'supportToClient' | 'clientToSupport';
  /** Label du bouton */
  label?: string;
  /** Classe */
  className?: string;
}

const WhatsappSupportButton: React.FC<SupportWhatsappButtonProps> = ({
  clientPhone,
  supportPhone,
  message,
  template,
  templateArgs = [],
  variant = 'supportToClient',
  label,
  className = ''
}) => {
  const getLink = () => {
    if (variant === 'clientToSupport') {
      const phone = supportPhone || getSupportPhone();
      if (template && (WhatsappTemplates as any)[template]) {
        const msg = (WhatsappTemplates as any)[template](...templateArgs);
        return getWhatsappLink(phone, msg);
      }
      return getClientToSupportLink(phone, undefined, message);
    } else {
      // support -> client
      if (!clientPhone) return '';
      if (template && (WhatsappTemplates as any)[template]) {
        const msg = (WhatsappTemplates as any)[template](...templateArgs);
        return getWhatsappLink(clientPhone, msg);
      }
      return getWhatsappLink(clientPhone, message);
    }
  };

  const link = getLink();
  if (!link) return null;

  const defaultLabel = variant === 'clientToSupport' ? 'Contacter le support sur WhatsApp' : 'Écrire sur WhatsApp';

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      <span>{label || defaultLabel}</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
};

export default WhatsappSupportButton;
