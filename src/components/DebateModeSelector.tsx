import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type DebateMode = 'fast' | 'balanced' | 'thorough' | 'custom';

export interface DebateModeConfig {
  name: string;
  icon: string;
  description: string;
  agents: string[];
  estimatedTime: string;
  quality: 'basic' | 'good' | 'excellent' | 'custom';
  color: string;
}

export const DEBATE_MODES: Record<DebateMode, DebateModeConfig> = {
  fast: {
    name: 'Rapide',
    icon: '⚡',
    description: 'Réponse directe avec synthèse uniquement',
    agents: ['synthesizer'],
    estimatedTime: '3-5s',
    quality: 'basic',
    color: 'blue'
  },
  balanced: {
    name: 'Équilibré',
    icon: '⚖️',
    description: 'Débat simplifié (Logique + Synthèse)',
    agents: ['logical', 'synthesizer'],
    estimatedTime: '8-10s',
    quality: 'good',
    color: 'green'
  },
  thorough: {
    name: 'Approfondi',
    icon: '🧠',
    description: 'Débat complet avec tous les agents',
    agents: ['logical', 'creative', 'critical', 'synthesizer'],
    estimatedTime: '14-16s',
    quality: 'excellent',
    color: 'purple'
  },
  custom: {
    name: 'Personnalisé',
    icon: '⚙️',
    description: 'Choisir manuellement les agents',
    agents: [],
    estimatedTime: 'variable',
    quality: 'custom',
    color: 'gray'
  }
};

interface DebateModeSelectorProps {
  currentMode: DebateMode;
  onModeChange: (mode: DebateMode) => void;
  customAgents?: string[];
  onCustomAgentsChange?: (agents: string[]) => void;
  className?: string;
}

interface CustomAgentSelectorProps {
  selectedAgents: string[];
  onAgentsChange: (agents: string[]) => void;
}

const AVAILABLE_AGENTS = [
  { id: 'logical', name: 'Agent Logique', description: 'Analyse rigoureuse et structurée' },
  { id: 'creative', name: 'Agent Créatif', description: 'Pensée divergente et exploration' },
  { id: 'critical', name: 'Agent Critique', description: 'Analyse sceptique et validation' },
  { id: 'synthesizer', name: 'Synthétiseur', description: 'Synthèse finale équilibrée', required: true }
];

const CustomAgentSelector: React.FC<CustomAgentSelectorProps> = ({ selectedAgents, onAgentsChange }) => {
  const handleToggle = (agentId: string, required: boolean) => {
    if (required) return; // Ne pas désactiver les agents obligatoires
    
    if (selectedAgents.includes(agentId)) {
      onAgentsChange(selectedAgents.filter(id => id !== agentId));
    } else {
      onAgentsChange([...selectedAgents, agentId]);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <Label className="text-sm font-medium">Sélectionner les agents</Label>
      <div className="space-y-2">
        {AVAILABLE_AGENTS.map(agent => {
          const isSelected = selectedAgents.includes(agent.id);
          const isRequired = agent.required;
          
          return (
            <div 
              key={agent.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                isSelected && "bg-accent/50 border-primary",
                isRequired && "bg-accent/30 border-dashed"
              )}
            >
              <Checkbox
                id={agent.id}
                checked={isSelected}
                disabled={isRequired}
                onCheckedChange={() => handleToggle(agent.id, isRequired || false)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label 
                  htmlFor={agent.id}
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  {agent.name}
                  {isRequired && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Obligatoire
                    </Badge>
                  )}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {agent.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        💡 Le Synthétiseur est toujours inclus pour générer la réponse finale.
      </p>
    </div>
  );
};

export const DebateModeSelector: React.FC<DebateModeSelectorProps> = ({ 
  currentMode, 
  onModeChange,
  customAgents = ['synthesizer'],
  onCustomAgentsChange,
  className
}) => {
  const getQualityBadgeVariant = (quality: string): "default" | "secondary" | "outline" => {
    if (quality === 'excellent') return 'default';
    if (quality === 'good') return 'secondary';
    return 'outline';
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">Mode de Débat</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.entries(DEBATE_MODES) as [DebateMode, DebateModeConfig][]).map(([key, mode]) => (
          <Card
            key={key}
            className={cn(
              "p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
              currentMode === key && "ring-2 ring-primary bg-accent/50"
            )}
            onClick={() => onModeChange(key)}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{mode.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{mode.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {mode.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px]">
                    ⏱️ {mode.estimatedTime}
                  </Badge>
                  <Badge 
                    variant={getQualityBadgeVariant(mode.quality)}
                    className="text-[10px]"
                  >
                    {mode.quality === 'excellent' && '⭐ '}
                    {mode.quality === 'good' && '✓ '}
                    {mode.quality === 'custom' && '⚙️ '}
                    {mode.quality}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {currentMode === 'custom' && onCustomAgentsChange && (
        <CustomAgentSelector 
          selectedAgents={customAgents}
          onAgentsChange={onCustomAgentsChange}
        />
      )}

      {/* Informations sur le mode sélectionné */}
      <Card className="p-3 bg-accent/30">
        <div className="flex items-start gap-2">
          <span className="text-lg">{DEBATE_MODES[currentMode].icon}</span>
          <div className="flex-1">
            <p className="text-xs font-medium">Mode actuel : {DEBATE_MODES[currentMode].name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentMode === 'custom' 
                ? `${customAgents.length} agent(s) sélectionné(s)`
                : `${DEBATE_MODES[currentMode].agents.length} agent(s) : ${DEBATE_MODES[currentMode].agents.join(', ')}`
              }
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
