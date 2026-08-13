import { RoutingStrategy, RoutingPlanLeg, RouterConfig } from '../types';
import { Order } from '@/types/trading';

/**
 * Equal split strategy - divides order equally across all available venues
 */
export class SplitEqualStrategy implements RoutingStrategy {
  buildPlan(order: Order, availableVenues: RouterConfig['venues']): RoutingPlanLeg[] {
    const legs: RoutingPlanLeg[] = [];
    const venueCount = availableVenues.length;
    
    if (venueCount === 0) {
      return [];
    }

    const baseQuantity = Math.floor(order.quantity / venueCount);
    const remainder = order.quantity % venueCount;

    availableVenues.forEach((venue, index) => {
      const legQuantity = baseQuantity + (index === 0 ? remainder : 0);
      
      if (legQuantity > 0) {
        legs.push({
          legId: `leg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          destination: {
            venueId: venue.id,
            venueType: venue.type,
            quantity: legQuantity,
          },
          status: 'pending',
          filled: 0,
          remaining: legQuantity,
          fills: [],
          attempts: 0,
        });
      }
    });

    return legs;
  }
}