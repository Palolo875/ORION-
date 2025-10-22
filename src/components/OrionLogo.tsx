import { BrainCircuit } from 'lucide-react';

interface OrionLogoProps {
  className?: string;
}

export const OrionLogo = ({ className }: OrionLogoProps) => {
  return <BrainCircuit className={className} data-testid="orion-logo" />;
};
