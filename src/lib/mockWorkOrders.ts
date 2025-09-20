export interface MockWorkOrder {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  asset?: string;
  assignee?: string;
  dueDate?: string;
  createdDate?: string;
  location?: string;
  instructions?: string;
}

export const mockWorkOrders: MockWorkOrder[] = [
  {
    id: 'WO-2024-001',
    title: 'Motor Overheating - Emergency Repair',
    description: 'Drive motor is running hot and making unusual noises. Needs immediate attention.',
    priority: 'Urgent',
    status: 'Assigned',
    asset: 'Drive Motor #1',
    assignee: 'John Smith',
    dueDate: 'Today',
    createdDate: '2 hours ago',
    location: 'Building A - Production Floor',
    instructions: 'Lockout/tagout required before servicing the motor.'
  },
  {
    id: 'WO-2024-002',
    title: 'Quarterly Hydraulic System Inspection',
    description: 'Routine quarterly inspection of hydraulic pump and associated components.',
    priority: 'Medium',
    status: 'Completed',
    asset: 'Hydraulic Pump #1',
    assignee: 'Jane Doe',
    dueDate: 'Yesterday',
    createdDate: '3 days ago',
    location: 'Building B - Maintenance Bay',
    instructions: 'Complete inspection checklist and upload photos of any wear.'
  },
  {
    id: 'WO-2024-003',
    title: 'Conveyor Belt Replacement',
    description: 'Replace worn conveyor belt before it fails.',
    priority: 'High',
    status: 'Open',
    asset: 'Conveyor Belt #1',
    assignee: 'Unassigned',
    dueDate: 'Next week',
    createdDate: '1 day ago',
    location: 'Building C - Packaging Line',
    instructions: 'Coordinate downtime with production supervisor before replacement.'
  }
];

export function getMockWorkOrderById(id: string) {
  return mockWorkOrders.find((workOrder) => workOrder.id === id);
}
