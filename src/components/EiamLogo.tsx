import { BrainCircuit } from 'lucide-react';

interface EiamLogoProps {
  className?: string;
}

export const EiamLogo = ({ className }: EiamLogoProps) => {
  return <BrainCircuit className={className} />;
};
