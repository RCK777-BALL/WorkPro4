declare module "@/lib/utils" {
  export function cn(...inputs: Array<string | number | false | null | undefined>): string
  export function formatCurrency(amount: number, currency?: string): string
  export function formatDate(date: string | number | Date): string
  export function formatDateTime(date: string | number | Date): string
  export function formatDuration(hours: number): string
  export function getInitials(firstName: string, lastName: string): string
  export function getStatusColor(status: string): string
  export function getPriorityColor(priority: string): string
}
