import type { Order } from "@/mocks/server";

// Removed unused API_BASE for now

/**
 * Mock API service for placing and canceling orders.
 * In a real application, this would interface with a REST backend.
 */

export async function placeOrder(order: Omit<Order, "id" | "status">): Promise<Order> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    ...order,
    id: `ord-${Date.now()}`,
    status: "open",
  };
}

export async function cancelOrder(orderId: string): Promise<boolean> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!orderId) return false;
  return true;
}
