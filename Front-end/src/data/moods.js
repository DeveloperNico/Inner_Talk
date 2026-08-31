import { Frown, Meh, Smile, Laugh, CloudRain } from 'lucide-react';

export const MOOD_OPTIONS = [
    { value: 1, label: 'Muito mal', icon: CloudRain, color: '#e0654f', bg: '#fdeceA' },
    { value: 2, label: 'Mal', icon: Frown, color: '#e0954f', bg: '#fdf3ea' },
    { value: 3, label: 'Neutro', icon: Meh, color: '#c9a227', bg: '#fbf6e2' },
    { value: 4, label: 'Bem', icon: Smile, color: '#4abba1', bg: '#e4fbf4' },
    { value: 5, label: 'Muito bem', icon: Laugh, color: '#3b9b8a', bg: '#dff6ef' },
];

export function getMoodOption(value) {
    return MOOD_OPTIONS.find((option) => option.value === value) || MOOD_OPTIONS[2];
}

export function getMoodAverage(entries) {
    if (!entries || entries.length === 0) return null;
    const sum = entries.reduce((total, entry) => total + entry.mood, 0);
    return sum / entries.length;
}
