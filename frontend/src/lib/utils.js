"use strict";
exports.__esModule = true;
exports.getPriorityColor = exports.getStatusColor = exports.getInitials = exports.formatDuration = exports.formatDateTime = exports.formatDate = exports.formatCurrency = exports.cn = void 0;
var clsx_1 = require("clsx");
var tailwind_merge_1 = require("tailwind-merge");
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
exports.cn = cn;
function formatCurrency(amount, currency) {
    if (currency === void 0) { currency = 'USD'; }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}
exports.formatCurrency = formatCurrency;
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(date));
}
exports.formatDate = formatDate;
function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(date));
}
exports.formatDateTime = formatDateTime;
function formatDuration(hours) {
    if (hours < 1) {
        return "".concat(Math.round(hours * 60), " min");
    }
    return "".concat(hours.toFixed(1), " hrs");
}
exports.formatDuration = formatDuration;
function getInitials(firstName, lastName) {
    return "".concat(firstName.charAt(0)).concat(lastName.charAt(0)).toUpperCase();
}
exports.getInitials = getInitials;
function getStatusColor(status) {
    switch (status) {
        case 'requested':
        case 'open':
            return 'bg-blue-100 text-blue-800';
        case 'approved':
            return 'bg-indigo-100 text-indigo-800';
        case 'assigned':
            return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
            return 'bg-orange-100 text-orange-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-gray-100 text-gray-800';
        case 'operational':
            return 'bg-green-100 text-green-800';
        case 'down':
            return 'bg-red-100 text-red-800';
        case 'maintenance':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}
exports.getStatusColor = getStatusColor;
function getPriorityColor(priority) {
    switch (priority) {
        case 'low':
            return 'bg-gray-100 text-gray-800';
        case 'medium':
            return 'bg-blue-100 text-blue-800';
        case 'high':
            return 'bg-orange-100 text-orange-800';
        case 'urgent':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}
exports.getPriorityColor = getPriorityColor;
