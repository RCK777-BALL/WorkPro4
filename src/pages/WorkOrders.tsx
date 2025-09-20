import { useState } from 'react';
import { ClipboardList, Plus, Search, Filter, User, Calendar, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { api } from '../lib/api';
import { mockWorkOrders, type MockWorkOrder } from '../lib/mockWorkOrders';
import { WorkOrderForm } from '../components/forms/WorkOrderForm';


export default function WorkOrders() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);


  const statusStats = [
    { label: 'Open', count: 24, color: colors.info },
    { label: 'In Progress', count: 8, color: colors.warning },
    { label: 'Completed', count: 156, color: colors.success },
    { label: 'Overdue', count: 3, color: colors.error }
  ];


  const getPriorityColor = (priority: string) => {
    switch ((priority ?? '').toLowerCase()) {
      case 'urgent': return colors.error;
      case 'high': return colors.warning;
      case 'medium': return colors.info;
      case 'low': return colors.success;
      default: return colors.mutedForeground;
    }
  };

  const getStatusColor = (status: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'open': return colors.info;
      case 'assigned': return colors.warning;
      case 'in progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.mutedForeground;
      default: return colors.mutedForeground;
    }
  };

  const filteredWorkOrders = statusFilter
    ? workOrders.filter((wo) => wo.status === statusFilter)
    : workOrders;


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Work Orders</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage and track maintenance work orders
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
          onClick={handleNewWorkOrder}

        >
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusStats.map((stat, index) => {
          const isActive = statusFilter === stat.label;

          return (
            <div
              key={index}
              onClick={() => setStatusFilter((prev) => (prev === stat.label ? null : stat.label))}
              className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer"
              style={{
                backgroundColor: isActive ? `${stat.color}20` : colors.card,
                borderColor: isActive ? stat.color : colors.border
              }}
            >
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</div>
              <div className="text-sm" style={{ color: colors.mutedForeground }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
            style={{ color: colors.mutedForeground }}
          />
          <input
            type="text"
            placeholder="Search work orders..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
          style={{ borderColor: colors.border, color: colors.foreground }}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.map((wo) => (

          <div
            key={wo.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}

          >
            <Filter className="w-4 h-4" />
            Filters
            {isFiltersApplied && (
              <span
                className="ml-1 inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
            )}
          </button>

          {showFilters && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border shadow-lg p-4 space-y-3 z-10"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Status</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  value={filters.status}
                  onChange={(event) => handleFilterChange('status', event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Priority</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  value={filters.priority}
                  onChange={(event) => handleFilterChange('priority', event.target.value)}
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: colors.foreground }}>Assignee</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground
                  }}
                  value={filters.assignee}
                  onChange={(event) => handleFilterChange('assignee', event.target.value)}
                >
                  {assigneeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: colors.foreground }}>Start date</label>
                  <input
                    type="date"
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground
                    }}
                  >
                    {wo.priority.toLowerCase() === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                    {wo.priority}
                  </span>
                </div>
                
                <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                  {wo.title}
                </h4>

                <p className="text-sm mb-3" style={{ color: colors.mutedForeground }}>
                  {wo.description ?? 'No description provided.'}
                </p>
                
                <div className="flex items-center gap-6 text-sm" style={{ color: colors.mutedForeground }}>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="w-4 h-4" />
                    Asset: {wo.asset ?? 'N/A'}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {wo.assignee ?? 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {wo.dueDate ?? 'TBD'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                  style={{ borderColor: colors.border, color: colors.foreground }}
                  onClick={() => handleViewWorkOrder(wo.id)}

                >
                  Clear filters
                </button>
                <button
                  className="px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                  onClick={() => handleUpdateWorkOrder(wo.id)}

                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {showFilters && (
        <div
          className="rounded-xl border p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(event) => handleFilterChange('priority', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Assignee
            </label>
            <select
              value={filters.assignee}
              onChange={(event) => handleFilterChange('assignee', event.target.value)}
              className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <option value="">All</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" style={{ color: colors.foreground }}>
              Created Date
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
                className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(event) => handleFilterChange('dateTo', event.target.value)}
                className="h-10 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              />
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 border rounded-xl text-sm hover:bg-opacity-80 transition-colors"
              style={{ borderColor: colors.border, color: colors.foreground }}
              onClick={() =>
                setFilters({ status: '', priority: '', assignee: '', dateFrom: '', dateTo: '' })
              }
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      <div className="space-y-4">
        {filteredWorkOrders.map((wo) => (
          <div
            key={wo.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}

          >
            No work orders found.
          </div>
        ) : (
          workOrders.map((wo) => (
            <div
              key={wo.id}
              className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                      {wo.id}
                    </h3>
                    <span
                      className="px-2 py-1 text-xs rounded-full"
                      style={{
                        backgroundColor: `${getStatusColor(wo.status)}20`,
                        color: getStatusColor(wo.status)
                      }}
                    >
                      {wo.status}
                    </span>
                    <span
                      className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: `${getPriorityColor(wo.priority)}20`,
                        color: getPriorityColor(wo.priority)
                      }}
                    >
                      {wo.priority === 'Urgent' && <AlertTriangle className="w-3 h-3" />}
                      {wo.priority}
                    </span>

                  </div>

                  <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                    {wo.title}
                  </h4>

                  <p className="text-sm mb-3" style={{ color: colors.mutedForeground }}>
                    {wo.description}
                  </p>

                  <div className="flex items-center gap-6 text-sm" style={{ color: colors.mutedForeground }}>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      Asset: {wo.asset}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {wo.assignee}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {wo.dueDate}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                    style={{ borderColor: colors.border, color: colors.foreground }}
                    onClick={() => handleView(wo.id)}
                  >
                    View
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                    onClick={() => handleUpdate(wo.id)}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isFormOpen && (
        <WorkOrderForm
          workOrderId={selectedWorkOrderId ?? undefined}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}

        />
      )}
    </div>
  );
}
