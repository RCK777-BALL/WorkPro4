export interface MockWorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  asset?: string;
  assignee?: string;
  dueDate?: string;
  createdDate?: string;
  instructions?: string;
}

export const mockWorkOrders: MockWorkOrder[] = [
  {
    id: 'WO-1024',
    title: 'Inspect hydraulic press',
    description: 'Perform a full safety inspection of the hydraulic press in line 3.',
    status: 'Scheduled',
    priority: 'High',
    asset: 'Hydraulic Press #3',
    assignee: 'Jamie Rivera',
    dueDate: 'Today 14:30',
    createdDate: 'Today 08:00',
    instructions:
      'Verify lockout/tagout, inspect hydraulic fluid levels, capture pictures of any leaks, and clear the area before restarting equipment.',
  },
  {
    id: 'WO-1025',
    title: 'Replace conveyor belt guard',
    description: 'Install the new safety guard on the outbound conveyor.',
    status: 'In Progress',
    priority: 'Medium',
    asset: 'Outbound Conveyor 2',
    assignee: 'Taylor Chen',
    dueDate: 'Tomorrow 09:00',
    createdDate: 'Yesterday 16:10',
    instructions:
      'Remove damaged guard, fit the replacement, torque bolts to specification, and document the serial of the new guard.',
  },
  {
    id: 'WO-1026',
    title: 'Lubricate palletizer drivetrain',
    description: 'Complete preventative lubrication on the palletizer main drivetrain.',
    status: 'Assigned',
    priority: 'Low',
    asset: 'Palletizer A',
    assignee: 'Morgan Lee',
    dueDate: 'Friday 15:00',
    createdDate: 'Monday 09:20',
    instructions:
      'Lock out equipment, clean grease points, apply OEM lubricant, and update the service log with meter readings.',
  },
];

export function getMockWorkOrderById(id: string): MockWorkOrder | undefined {
  return mockWorkOrders.find((workOrder) => workOrder.id === id);
}
