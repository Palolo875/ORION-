/**
 * Composant de Gestion du Contexte Ambiant
 * 
 * Permet à l'utilisateur de créer, modifier et gérer des contextes
 * ambiants qui enrichissent automatiquement toutes ses requêtes.
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, AlertCircle, Info, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { ambientContextService } from '@/services/ambient-context-service';
import { AMBIENT_CONTEXT_CONSTRAINTS } from '@/types/ambient-context';
import type { AmbientContext } from '@/types/ambient-context';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const AmbientContextManager = () => {
  const [contexts, setContexts] = useState<AmbientContext[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les contextes au montage
  useEffect(() => {
    loadContexts();
  }, []);

  const loadContexts = async () => {
    setLoading(true);
    try {
      const loaded = await ambientContextService.getContexts();
      setContexts(loaded);
    } catch (err) {
      console.error('Erreur chargement contextes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    
    const result = await ambientContextService.saveContext(newContent, newTitle || undefined);
    
    if (result.success && result.data) {
      setContexts(prev => [result.data!, ...prev]);
      setNewContent('');
      setNewTitle('');
      setIsCreating(false);
      toast({
        title: 'Contexte créé',
        description: 'Le contexte ambiant a été enregistré avec succès.',
      });
    } else {
      setError(result.error || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<AmbientContext>) => {
    setError(null);
    
    const result = await ambientContextService.updateContext(id, updates);
    
    if (result.success && result.data) {
      setContexts(prev => prev.map(c => c.id === id ? result.data! : c));
      setEditingId(null);
      toast({
        title: 'Contexte mis à jour',
        description: 'Les modifications ont été enregistrées.',
      });
    } else {
      setError(result.error || 'Erreur lors de la mise à jour');
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (context: AmbientContext) => {
    await handleUpdate(context.id, { isActive: !context.isActive });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contexte ?')) {
      return;
    }

    const result = await ambientContextService.deleteContext(id);
    
    if (result.success) {
      setContexts(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Contexte supprimé',
        description: 'Le contexte a été supprimé avec succès.',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const activeCount = contexts.filter(c => c.isActive).length;
  const canCreateMore = contexts.length < AMBIENT_CONTEXT_CONSTRAINTS.MAX_CONTEXTS;
  const canActivateMore = activeCount < AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS;
  const charCount = newContent.length;
  const isValid = charCount >= AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH && 
                  charCount <= AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Chargement des contextes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Contextes Ambiants</h2>
          </div>
          <Badge variant="outline">
            {activeCount}/{AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS} actifs
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Définissez des informations persistantes qui enrichiront automatiquement toutes vos conversations.
        </p>
      </div>

      {/* Information */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Les contextes actifs sont automatiquement inclus dans chaque requête. 
          Maximum {AMBIENT_CONTEXT_CONSTRAINTS.MAX_ACTIVE_CONTEXTS} contextes actifs simultanément.
        </AlertDescription>
      </Alert>

      {/* Formulaire de création */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouveau contexte ambiant</CardTitle>
            <CardDescription className="text-xs">
              {AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH}-{AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH} caractères
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title" className="text-sm">Titre (optionnel)</Label>
              <Input
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Mon projet actuel"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-content" className="text-sm">Contenu</Label>
                <span className={cn(
                  "text-xs font-mono",
                  charCount < AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH && "text-muted-foreground",
                  charCount >= AMBIENT_CONTEXT_CONSTRAINTS.MIN_LENGTH && 
                  charCount <= AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH && "text-green-600",
                  charCount > AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH && "text-destructive"
                )}>
                  {charCount}/{AMBIENT_CONTEXT_CONSTRAINTS.MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="new-content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Ex: Je travaille sur un projet de chatbot IA avec React et TypeScript..."
                rows={4}
                className="resize-none"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleCreate}
                disabled={!isValid}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Créer
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewContent('');
                  setNewTitle('');
                  setError(null);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton d'ajout */}
      {!isCreating && (
        <Button
          onClick={() => setIsCreating(true)}
          disabled={!canCreateMore}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contexte {!canCreateMore && '(limite atteinte)'}
        </Button>
      )}

      {/* Liste des contextes */}
      <div className="space-y-3">
        {contexts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground text-sm">
              Aucun contexte ambiant défini. Créez-en un pour enrichir vos conversations !
            </CardContent>
          </Card>
        ) : (
          contexts.map((context) => (
            <Card key={context.id} className={cn(
              "transition-all",
              context.isActive && "border-primary/50 bg-primary/5"
            )}>
              <CardContent className="pt-6 space-y-3">
                {/* En-tête avec titre et switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {context.title && (
                      <h3 className="font-medium text-sm mb-1 truncate">
                        {context.title}
                      </h3>
                    )}
                    <p className="text-sm text-muted-foreground break-words">
                      {context.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={context.isActive}
                        onCheckedChange={() => handleToggleActive(context)}
                        disabled={!context.isActive && !canActivateMore}
                        className="data-[state=checked]:bg-primary"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {context.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    {new Date(context.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(context.id)}
                      className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
