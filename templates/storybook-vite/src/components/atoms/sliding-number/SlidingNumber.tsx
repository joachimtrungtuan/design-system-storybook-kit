import { motion } from "motion/react";

export interface SlidingNumberProps { value: number; }

export function SlidingNumber({ value }: SlidingNumberProps) {
  return <motion.span animate={{ opacity: 1, y: 0 }} className="font-medium text-heading" initial={{ opacity: 0, y: -8 }}>{value}</motion.span>;
}
