/**
 * Composant de Gestion des Agents Personnalisés
 * 
 * Permet de créer, modifier et gérer des agents IA personnalisés.
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Save, X, Sparkles, Zap, Info, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { customAgentService } from '@/services/custom-agent-service';
import { CUSTOM_AGENT_CONSTRAINTS, AGENT_PRESETS } from '@/types/custom-agent';
import type { CustomAgent, AgentCategory, AgentPreset } from '@/types/custom-agent';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const CustomAgentManager = () => {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    category: 'other' as AgentCategory,
    temperature: 0.7,
    maxTokens: 1000,
    isActive: true,
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const loaded = await customAgentService.getAgents();
      setAgents(loaded);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      category: 'other',
      temperature: 0.7,
      maxTokens: 1000,
      isActive: true,
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    const result = await customAgentService.saveAgent(formData);
    
    if (result.success && result.data) {
      setAgents(prev => [result.data!, ...prev]);
      resetForm();
      toast({
        title: 'Agent créé',
        description: `L'agent "${result.data.name}" a été créé avec succès.`,
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    const result = await customAgentService.updateAgent(editingId, formData);
    
    if (result.success && result.data) {
      setAgents(prev => prev.map(a => a.id === editingId ? result.data! : a));
      resetForm();
      toast({
        title: 'Agent mis à jour',
        description: 'Les modifications ont été enregistrées.',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (agent: CustomAgent) => {
    setFormData({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      category: agent.category,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isActive: agent.isActive,
    });
    setEditingId(agent.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      return;
    }

    const result = await customAgentService.deleteAgent(id);
    
    if (result.success) {
      setAgents(prev => prev.filter(a => a.id !== id));
      toast({
        title: 'Agent supprimé',
        description: 'L\'agent a été supprimé avec succès.',
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    const result = await customAgentService.duplicateAgent(id);
    
    if (result.success && result.data) {
      setAgents(prev => [result.data!, ...prev]);
      toast({
        title: 'Agent dupliqué',
        description: `L'agent a été dupliqué avec succès.`,
      });
    }
  };

  const handleCreateFromPreset = async (preset: AgentPreset) => {
    const result = await customAgentService.createFromPreset(preset);
    
    if (result.success && result.data) {
      setAgents(prev => [result.data!, ...prev]);
      toast({
        title: 'Agent créé depuis preset',
        description: `L'agent "${preset.name}" a été créé.`,
      });
    }
  };

  const canCreateMore = agents.length < CUSTOM_AGENT_CONSTRAINTS.MAX_AGENTS;
  const isFormValid = 
    formData.name.length >= CUSTOM_AGENT_CONSTRAINTS.MIN_NAME_LENGTH &&
    formData.description.length >= CUSTOM_AGENT_CONSTRAINTS.MIN_DESCRIPTION_LENGTH &&
    formData.systemPrompt.length >= CUSTOM_AGENT_CONSTRAINTS.MIN_PROMPT_LENGTH;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Chargement des agents...</span>
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
            <h2 className="text-xl font-semibold">Agents Personnalisés</h2>
          </div>
          <Badge variant="outline">
            {agents.length}/{CUSTOM_AGENT_CONSTRAINTS.MAX_AGENTS} agents
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Créez vos propres agents IA avec des comportements et prompts personnalisés.
        </p>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents">Mes Agents</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
        </TabsList>

        {/* Onglet Agents */}
        <TabsContent value="agents" className="space-y-4">
          {/* Formulaire de création/édition */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingId ? 'Modifier l\'agent' : 'Nouvel agent personnalisé'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Expert Python"
                      maxLength={CUSTOM_AGENT_CONSTRAINTS.MAX_NAME_LENGTH}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formData.name.length}/{CUSTOM_AGENT_CONSTRAINTS.MAX_NAME_LENGTH}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={formData.category} onValueChange={(v: AgentCategory) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="writing">Writing</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Courte description de l'agent"
                    maxLength={CUSTOM_AGENT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.description.length}/{CUSTOM_AGENT_CONSTRAINTS.MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt *</Label>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    placeholder="Instructions détaillées pour l'agent..."
                    rows={8}
                    className="resize-none font-mono text-sm"
                  />
                  <span className={cn(
                    "text-xs",
                    formData.systemPrompt.length < CUSTOM_AGENT_CONSTRAINTS.MIN_PROMPT_LENGTH && "text-muted-foreground",
                    formData.systemPrompt.length >= CUSTOM_AGENT_CONSTRAINTS.MIN_PROMPT_LENGTH && "text-green-600"
                  )}>
                    {formData.systemPrompt.length}/{CUSTOM_AGENT_CONSTRAINTS.MAX_PROMPT_LENGTH}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Température: {formData.temperature.toFixed(1)}</Label>
                    <Slider
                      value={[formData.temperature]}
                      onValueChange={([v]) => setFormData(prev => ({ ...prev, temperature: v }))}
                      min={CUSTOM_AGENT_CONSTRAINTS.MIN_TEMPERATURE}
                      max={CUSTOM_AGENT_CONSTRAINTS.MAX_TEMPERATURE}
                      step={0.1}
                    />
                    <span className="text-xs text-muted-foreground">
                      Plus élevé = plus créatif
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens: {formData.maxTokens}</Label>
                    <Slider
                      value={[formData.maxTokens]}
                      onValueChange={([v]) => setFormData(prev => ({ ...prev, maxTokens: v }))}
                      min={CUSTOM_AGENT_CONSTRAINTS.MIN_MAX_TOKENS}
                      max={CUSTOM_AGENT_CONSTRAINTS.MAX_MAX_TOKENS}
                      step={100}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>Activer l'agent</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={editingId ? handleUpdate : handleCreate} disabled={!isFormValid} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
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
              Nouvel agent {!canCreateMore && '(limite atteinte)'}
            </Button>
          )}

          {/* Liste des agents */}
          <div className="space-y-3">
            {agents.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground text-sm">
                  Aucun agent personnalisé. Créez-en un ou utilisez un preset !
                </CardContent>
              </Card>
            ) : (
              agents.map((agent) => (
                <Card key={agent.id} className={cn(
                  "transition-all",
                  agent.isActive && "border-primary/50 bg-primary/5"
                )}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {agent.category}
                          </Badge>
                          {agent.isActive && (
                            <Badge className="text-xs">Actif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{agent.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Temp: {agent.temperature}</span>
                          <span>•</span>
                          <span>Tokens: {agent.maxTokens}</span>
                          <span>•</span>
                          <span>Utilisé {agent.useCount || 0}x</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                        className="h-7"
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(agent.id)}
                        className="h-7"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Dupliquer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(agent.id)}
                        className="h-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Onglet Presets */}
        <TabsContent value="presets" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Les presets sont des agents pré-configurés que vous pouvez utiliser comme point de départ.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            {AGENT_PRESETS.map((preset, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <h3 className="font-medium text-sm">{preset.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {preset.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Temp: {preset.temperature}</span>
                        <span>•</span>
                        <span>Tokens: {preset.maxTokens}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromPreset(preset)}
                      disabled={!canCreateMore}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Utiliser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
