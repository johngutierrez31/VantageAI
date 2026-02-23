import { PlanTier } from '@prisma/client';
import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.nativeEnum(PlanTier).refine((value) => value !== 'FREE', {
    message: 'Checkout plan must be paid tier'
  })
});
