function normalizePhoneNumber(phones, defaultDDD) {
    if (!phones) return null;

    let phone = phones.replace(/.*?:\s*/gi, '');
    let cleaned = phone.replace(/[\(\)\-\s]/g, '');
    cleaned = cleaned.replace(/^\++/, '+');

    if (cleaned.startsWith('*')) {
        return { number: phone, note: 'Número de operadora' };
    }

    if (cleaned.startsWith('0800')) {
        return { number: cleaned, note: 'Telefone 0800' };
    }

    if (cleaned.startsWith('(0)')) {
        cleaned = cleaned.slice(3);
    } else if (cleaned.startsWith('0')) {
        cleaned = cleaned.slice(1);
    }

    if (cleaned.startsWith('+')) {
        if (cleaned.startsWith('+55')) {
            cleaned = cleaned.slice(3);
        } else if (cleaned.startsWith('+19')) {
            let qtdNum = cleaned.length;
            if (qtdNum === 11) {
                cleaned = cleaned.slice(1);
            }
        } else {
            return { number: cleaned, note: 'Internacional' };
        }
    } else if (cleaned.startsWith('00')) {
        if (cleaned.startsWith('0055')) {
            cleaned = cleaned.slice(4);
        } else {
            return { number: cleaned, note: 'Internacional' };
        }
    }

    if (cleaned.length >= 12) {
        cleaned = cleaned.slice(cleaned.length - 11);
    }

    if (cleaned.length === 8 || cleaned.length === 9) {
        cleaned = `${defaultDDD}${cleaned}`;
    }

    if (cleaned.length === 10 || cleaned.length === 11) {
        return { number: cleaned, note: '' };
    }

    return null;
}

function extractPhoneNumbers(cellContent) {
    if (!cellContent) return [];
    let cleanedContent = cellContent.replace(/[\(\)\-\s]/g, '');
    const matches = cleanedContent.match(/(\*?\+?\d{3,15})/g);
    return matches || [];
}

module.exports = { normalizePhoneNumber, extractPhoneNumbers };
