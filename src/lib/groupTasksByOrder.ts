import type { MyShipmentTaskCard } from "@/api/shipments";

/**
 * One order can hold several vehicles (multiple shipments) — same
 * customer, same address, same timeslot, one pilot working through them
 * one by one. The task-card API returns one row per SHIPMENT, so without
 * this grouping step the pilot sees N separate-looking "jobs" for what
 * is actually one visit. Shared by Home and Schedule so they can't drift
 * apart on how a multi-vehicle order gets presented.
 */
export interface OrderTaskGroup {
  orderId: string;
  orderNumber: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  serviceName: string;
  customerName: string | null;
  addressLabel: string;
  hasOpenIssue: boolean;
  tasks: MyShipmentTaskCard[];
}

export function groupTasksByOrder(tasks: MyShipmentTaskCard[]): OrderTaskGroup[] {
  const groups = new Map<string, OrderTaskGroup>();

  for (const task of tasks) {
    const existing = groups.get(task.order.id);
    if (existing) {
      existing.tasks.push(task);
      existing.hasOpenIssue = existing.hasOpenIssue || task.hasOpenIssue;
      continue;
    }

    groups.set(task.order.id, {
      orderId: task.order.id,
      orderNumber: task.order.orderNumber,
      scheduledStartTime: task.scheduledStartTime,
      scheduledEndTime: task.scheduledEndTime,
      serviceName: task.service.opItemName,
      customerName: task.customer.name,
      addressLabel: task.address.label,
      hasOpenIssue: task.hasOpenIssue,
      tasks: [task],
    });
  }

  // Map preserves insertion order, which is already the API's own sort
  // (scheduled time) — first task of each order determines its slot.
  return [...groups.values()];
}
