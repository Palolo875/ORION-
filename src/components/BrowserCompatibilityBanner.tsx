import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  detectBrowserCompatibility, 
  getBrowserRecommendation, 
  getBrowserInfo,
  BrowserCompatibility 
} from "@/utils/browserCompatibility";
import { cn } from "@/lib/utils";

export const BrowserCompatibilityBanner = () => {
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function checkCompatibility() {
      const result = await detectBrowserCompatibility();
      setCompatibility(result);
      
      // Log les informations pour le debug
      const browserInfo = getBrowserInfo();
      console.log('[Compatibilité] Navigateur:', browserInfo);
      console.log('[Compatibilité] Résultat:', result);
    }
    
    checkCompatibility();
  }, []);

  if (!compatibility || !isVisible) {
    return null;
  }

  // Ne rien afficher si tout est compatible et qu'il n'y a pas d'avertissements
  if (compatibility.isCompatible && compatibility.warnings.length === 0) {
    return null;
  }

  const browserInfo = getBrowserInfo();
  const hasCriticalIssue = !compatibility.isCompatible;

  return (
    <div className={cn(
      "fixed top-16 left-0 right-0 z-50 mx-auto max-w-4xl px-4",
      "animate-in slide-in-from-top duration-300"
    )}>
      <Alert 
        variant={hasCriticalIssue ? "destructive" : "default"}
        className="glass border-2 shadow-lg"
      >
        <div className="flex items-start gap-3">
          {hasCriticalIssue ? (
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <AlertTitle className="text-base font-semibold">
                  {hasCriticalIssue 
                    ? "Navigateur non compatible" 
                    : "Compatibilité partielle"}
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium">
                      Navigateur détecté: {browserInfo.name} {browserInfo.version} sur {browserInfo.os}
                    </p>
                    
                    {compatibility.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {compatibility.warnings.slice(0, isExpanded ? undefined : 2).map((warning, index) => (
                          <p key={index} className="text-xs">
                            {warning}
                          </p>
                        ))}
                        
                        {compatibility.warnings.length > 2 && !isExpanded && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setIsExpanded(true)}
                            className="h-auto p-0 text-xs"
                          >
                            Voir plus ({compatibility.warnings.length - 2} autres)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-3 pt-2 border-t">
                {/* Détails de compatibilité */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Détails de compatibilité:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <CompatibilityItem 
                      label="WebGPU" 
                      supported={compatibility.webGPU.supported}
                      message={compatibility.webGPU.message}
                    />
                    <CompatibilityItem 
                      label="WebGL (Fallback)" 
                      supported={compatibility.webGL.supported}
                      message={compatibility.webGL.message}
                    />
                    <CompatibilityItem 
                      label="Reconnaissance vocale" 
                      supported={compatibility.speechRecognition.supported}
                      message={compatibility.speechRecognition.message}
                    />
                    <CompatibilityItem 
                      label="Synthèse vocale (TTS)" 
                      supported={compatibility.speechSynthesis.supported}
                      message={compatibility.speechSynthesis.message}
                    />
                    <CompatibilityItem 
                      label="Import de fichiers" 
                      supported={compatibility.fileAPI.supported}
                      message={compatibility.fileAPI.message}
                    />
                    <CompatibilityItem 
                      label="Web Workers" 
                      supported={compatibility.webWorkers.supported}
                      message={compatibility.webWorkers.message}
                    />
                  </div>
                </div>

                {/* Recommandations */}
                {compatibility.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Recommandations:</h4>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      {compatibility.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                      <li>{getBrowserRecommendation()}</li>
                    </ul>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-xs"
                >
                  Réduire
                </Button>
              </div>
            )}

            {!isExpanded && compatibility.recommendations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="text-xs mt-2"
              >
                Voir les recommandations
              </Button>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
};

interface CompatibilityItemProps {
  label: string;
  supported: boolean;
  message: string;
}

const CompatibilityItem = ({ label, supported, message }: CompatibilityItemProps) => (
  <div className="flex items-start gap-2 p-2 rounded-lg glass-hover">
    {supported ? (
      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
    ) : (
      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2" title={message}>
        {message}
      </p>
    </div>
  </div>
);
