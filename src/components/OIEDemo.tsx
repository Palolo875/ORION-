/**
 * Composant de démonstration de l'Orion Inference Engine
 * Exemple d'utilisation du hook useOIE
 */

import { useState } from 'react';
import { useOIE } from '@/hooks/useOIE';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle2, XCircle, Cpu } from 'lucide-react';

export function OIEDemo() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);
  
  const { isReady, isProcessing, ask, error, getStats, availableAgents } = useOIE({
    maxMemoryMB: 8000,
    maxAgentsInMemory: 2,
    enableVision: true,
    enableCode: true,
  });

  const handleSend = async () => {
    if (!query.trim() || !isReady || isProcessing) return;
    
    try {
      const result = await ask(query);
      setResponse(result);
      setQuery('');
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const stats = getStats();

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Orion Inference Engine - Démo
          </CardTitle>
          <CardDescription>
            Testez le nouveau moteur d'inférence avec agents spécialisés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* État du moteur */}
          <div className="flex items-center gap-2">
            {isReady ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Moteur prêt
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Initialisation...
              </Badge>
            )}
            
            {availableAgents.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {availableAgents.length} agents disponibles
              </span>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Posez une question..."
              disabled={!isReady || isProcessing}
            />
            <Button 
              onClick={handleSend}
              disabled={!isReady || isProcessing || !query.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery("Écris une fonction JavaScript pour trier un tableau")}
            >
              Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery("Explique pourquoi le ciel est bleu")}
            >
              Logique
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery("Raconte-moi une histoire courte")}
            >
              Créatif
            </Button>
          </div>

          {/* Réponse */}
          {response && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Réponse</CardTitle>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{response.agentId}</Badge>
                    <span>{response.processingTime.toFixed(0)}ms</span>
                    <span>{response.confidence}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{response.content}</p>
              </CardContent>
            </Card>
          )}

          {/* Statistiques */}
          {stats && stats.agentsLoaded > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Statistiques du Cache</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Agents chargés</div>
                    <div className="font-semibold">{stats.agentsLoaded}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mémoire utilisée</div>
                    <div className="font-semibold">
                      {stats.totalMemoryMB}MB / {stats.maxMemoryMB}MB
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Utilisation</div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${stats.memoryUsagePercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.memoryUsagePercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {stats.agents && stats.agents.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className="text-xs text-muted-foreground">Agents en mémoire</div>
                    {stats.agents.map((agent: any) => (
                      <div key={agent.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium">{agent.id}</span>
                        <div className="flex gap-2 text-muted-foreground">
                          <span>{agent.memoryMB}MB</span>
                          <span>×{agent.accessCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
