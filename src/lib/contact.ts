/** wa.me link for an Indonesian number like 0812… or +62812…. */
export function whatsappLink(number: string, text = ''): string {
	const digits = number.replace(/\D/g, '').replace(/^0/, '62');
	return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** 0812-3456-7890 style display. */
export function formatPhone(number: string): string {
	const d = number.replace(/\D/g, '').replace(/^62/, '0');
	return d.replace(/^(\d{4})(\d{4})(\d+)$/, '$1-$2-$3');
}
