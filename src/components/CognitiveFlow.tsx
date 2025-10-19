import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, Database, Cpu, MessageSquare, Clock, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Les étapes possibles de notre flux
export type FlowStep = 'query' | 'tool_search' | 'memory_search' | 'llm_reasoning' | 'final_response' | 'idle' | 'multi_agent_critical' | 'multi_agent_synthesis';

interface CognitiveFlowProps {
  currentStep: FlowStep;
  stepDetails: string;
}

interface StepConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
}

const stepsConfig: Record<FlowStep, StepConfig> = {
  idle: { 
    label: 'En attente', 
    icon: <Clock className="h-4 w-4" />,
    description: 'Prêt à recevoir une requête'
  },
  query: { 
    label: 'Requête Utilisateur', 
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Analyse de votre question'
  },
  tool_search: { 
    label: "Recherche d'Outils", 
    icon: <Search className="h-4 w-4" />,
    description: 'Vérification des outils disponibles'
  },
  memory_search: { 
    label: 'Scan Mémoriel', 
    icon: <Database className="h-4 w-4" />,
    description: 'Recherche dans la mémoire'
  },
  llm_reasoning: { 
    label: 'Raisonnement LLM', 
    icon: <Brain className="h-4 w-4" />,
    description: 'Génération de la réponse'
  },
  final_response: { 
    label: 'Synthèse Finale', 
    icon: <Cpu className="h-4 w-4" />,
    description: 'Préparation de la réponse'
  },
  multi_agent_critical: {
    label: 'Analyse Multi-Agents',
    icon: <Users className="h-4 w-4" />,
    description: 'Débat critique entre agents'
  },
  multi_agent_synthesis: {
    label: 'Synthèse Collective',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Fusion des perspectives'
  },
};

const stepOrder: FlowStep[] = ['query', 'tool_search', 'memory_search', 'llm_reasoning', 'final_response'];

export const CognitiveFlow: React.FC<CognitiveFlowProps> = ({ currentStep, stepDetails }) => {
  const getCurrentStepIndex = () => {
    if (currentStep === 'idle') return -1;
    return stepOrder.indexOf(currentStep);
  };

  const currentIndex = getCurrentStepIndex();
  const isActive = currentStep !== 'idle';

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-semibold">Flux Cognitif</h4>
      </div>
      
      {/* Steps visualization */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-muted" />
        
        {/* Active progress bar */}
        {isActive && (
          <motion.div 
            className="absolute top-[18px] left-0 h-0.5 bg-primary"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(currentIndex + 1) * (100 / stepOrder.length)}%` 
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        )}

        {/* Steps */}
        <div className="relative flex justify-between">
          {stepOrder.map((key, index) => {
            const config = stepsConfig[key];
            const isCurrentStep = currentStep === key;
            const isPast = currentIndex > index;
            const isFuture = currentIndex < index;

            return (
              <motion.div
                key={key}
                className="flex flex-col items-center gap-2 flex-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Step icon */}
                <motion.div
                  className={cn(
                    "relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all",
                    isCurrentStep && "bg-primary border-primary text-primary-foreground shadow-lg scale-110",
                    isPast && "bg-primary/20 border-primary text-primary",
                    isFuture && "bg-background border-muted text-muted-foreground"
                  )}
                  animate={isCurrentStep ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: isCurrentStep ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {config.icon}
                  
                  {/* Pulse effect for current step */}
                  {isCurrentStep && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.5 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                  )}
                </motion.div>

                {/* Step label */}
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrentStep && "text-primary font-semibold",
                    isPast && "text-foreground",
                    isFuture && "text-muted-foreground"
                  )}>
                    {config.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current step details */}
      <motion.div 
        className="mt-4 p-3 rounded-xl bg-accent/30 border border-border"
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-primary">
            {stepsConfig[currentStep].icon}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium text-foreground">
              {stepsConfig[currentStep].description}
            </p>
            {stepDetails && (
              <p className="text-xs text-muted-foreground">
                {stepDetails}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
