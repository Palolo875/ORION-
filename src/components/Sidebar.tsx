import { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  Archive,
  Pin,
  Filter,
  TrendingUp,
  Clock,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "./ui/dropdown-menu";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isPreviousOpen, setIsPreviousOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "favorites" | "archived">("all");

  const today = new Date();
  
  // Filter conversations by search query
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const todayConversations = filteredConversations.filter(conv => {
    const convDate = new Date(conv.timestamp);
    return convDate.toDateString() === today.toDateString();
  });
  
  const previousConversations = filteredConversations.filter(conv => {
    const convDate = new Date(conv.timestamp);
    return convDate.toDateString() !== today.toDateString();
  });

  const handleRename = (id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setEditingId(id);
      setEditingTitle(conversation.title);
    }
  };

  const handleSaveRename = () => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar - Design flottant organique */}
      <div className={cn(
        "fixed top-4 bottom-4 left-4 z-50 floating-panel glass border border-[hsl(var(--glass-border))] lg:relative lg:top-0 lg:bottom-0 lg:left-0 lg:z-auto smooth-interaction animate-slide-in-left",
        isCollapsed ? "w-16" : "w-80"
      )}>
        <div className="flex flex-col h-full rounded-[1.5rem] overflow-hidden">
          {/* Header - Design organique */}
          <div className="p-4 border-b border-[hsl(var(--glass-border))] space-y-3 bg-gradient-to-b from-[hsl(var(--pastel-feather))]/30 to-transparent">
            {!isCollapsed && (
              <Button
                onClick={onNewConversation}
                className="w-full justify-start gap-2 h-11 glass-hover rounded-[1.5rem] bg-gradient-to-br from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10 border-[hsl(var(--pastel-sage))]/30 smooth-interaction"
                variant="outline"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Nouvelle conversation</span>
              </Button>
            )}
            
            {isCollapsed && (
              <Button
                onClick={onNewConversation}
                className="w-full h-11 glass-hover rounded-[1.5rem] bg-gradient-to-br from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10 smooth-interaction"
                variant="outline"
                size="icon"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
            
            {/* Collapse/Expand button */}
            {onToggleCollapse && (
              <Button
                onClick={onToggleCollapse}
                variant="ghost"
                size="icon"
                className="w-full h-9 rounded-[1.25rem] hover:bg-[hsl(var(--pastel-feather))]/50 smooth-interaction"
                title={isCollapsed ? "Développer" : "Réduire"}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            )}

            {!isCollapsed && (
              <>
                {/* Search Bar - Intégré dans la sidebar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9 h-10 rounded-[1.25rem] bg-white/50 dark:bg-black/20 border-[hsl(var(--glass-border))] focus:border-[hsl(var(--pastel-sage))]/50 smooth-interaction"
                  />
                </div>

                {/* Stats - Design organique */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="glass rounded-[1rem] p-2.5 smooth-interaction hover:shadow-md bg-gradient-to-br from-[hsl(var(--pastel-sky))]/20 to-[hsl(var(--pastel-feather))]/10">
                    <div className="text-lg font-bold text-foreground">{conversations.length}</div>
                    <div className="text-xs text-muted-foreground font-medium">Total</div>
                  </div>
                  <div className="glass rounded-[1rem] p-2.5 smooth-interaction hover:shadow-md bg-gradient-to-br from-[hsl(var(--pastel-sage))]/20 to-[hsl(var(--pastel-mint))]/10">
                    <div className="text-lg font-bold text-primary">{todayConversations.length}</div>
                    <div className="text-xs text-muted-foreground font-medium">Aujourd'hui</div>
                  </div>
                  <div className="glass rounded-[1rem] p-2.5 smooth-interaction hover:shadow-md bg-gradient-to-br from-[hsl(var(--pastel-rose))]/20 to-[hsl(var(--pastel-peach))]/10">
                    <div className="text-lg font-bold text-primary flex justify-center">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">Actif</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-2">
            {isCollapsed ? (
              <div className="space-y-2">
                {filteredConversations.slice(0, 10).map((conversation) => (
                  <Button
                    key={conversation.id}
                    variant={conversation.id === currentConversationId ? "default" : "ghost"}
                    size="icon"
                    onClick={() => onSelectConversation(conversation.id)}
                    className="w-full h-10 rounded-lg"
                    title={conversation.title}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            ) : (
            <div className="space-y-2">
              {/* Today's conversations */}
              {todayConversations.length > 0 && (
                <Collapsible open={isTodayOpen} onOpenChange={setIsTodayOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span>Aujourd'hui</span>
                      {isTodayOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {todayConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === currentConversationId}
                        onSelect={() => onSelectConversation(conversation.id)}
                        onRename={() => handleRename(conversation.id)}
                        onDelete={() => onDeleteConversation(conversation.id)}
                        isEditing={editingId === conversation.id}
                        editingTitle={editingTitle}
                        onEditingTitleChange={setEditingTitle}
                        onSaveRename={handleSaveRename}
                        onCancelRename={handleCancelRename}
                        formatTime={formatTime}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Previous conversations */}
              {previousConversations.length > 0 && (
                <Collapsible open={isPreviousOpen} onOpenChange={setIsPreviousOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span>Précédentes</span>
                      {isPreviousOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {previousConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === currentConversationId}
                        onSelect={() => onSelectConversation(conversation.id)}
                        onRename={() => handleRename(conversation.id)}
                        onDelete={() => onDeleteConversation(conversation.id)}
                        isEditing={editingId === conversation.id}
                        editingTitle={editingTitle}
                        onEditingTitleChange={setEditingTitle}
                        onSaveRename={handleSaveRename}
                        onCancelRename={handleCancelRename}
                        formatTime={formatTime}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Empty state */}
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucune conversation
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Commencez une nouvelle conversation
                  </p>
                </div>
              )}

              {/* No results */}
              {conversations.length > 0 && filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucun résultat
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Essayez une autre recherche
                  </p>
                </div>
              )}
            </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  formatTime: (date: Date) => string;
}

const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  isEditing,
  editingTitle,
  onEditingTitleChange,
  onSaveRename,
  onCancelRename,
  formatTime
}: ConversationItemProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSaveRename();
    } else if (e.key === "Escape") {
      onCancelRename();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 p-2.5 rounded-[1.25rem] cursor-pointer smooth-interaction",
        isActive
          ? "bg-gradient-to-br from-[hsl(var(--pastel-sage))]/30 to-[hsl(var(--pastel-mint))]/20 shadow-sm border border-[hsl(var(--pastel-sage))]/30"
          : "hover:bg-[hsl(var(--pastel-feather))]/40 hover:shadow-sm"
      )}
      onClick={!isEditing ? onSelect : undefined}
    >
      <div className="flex items-center gap-2 shrink-0">
        <MessageSquare className={cn("h-4 w-4", isActive && "text-primary")} />
        {isActive && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
      </div>
      
      {isEditing ? (
        <Input
          value={editingTitle}
          onChange={(e) => onEditingTitleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onSaveRename}
          className="h-6 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          autoFocus
        />
      ) : (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn("text-sm font-medium truncate flex-1", isActive && "text-primary")}>
              {conversation.title}
            </p>
            <Clock className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conversation.lastMessage}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatTime(conversation.timestamp)}
          </p>
        </div>
      )}

      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-[hsl(var(--pastel-feather))]/60 rounded-full smooth-interaction"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-[1.25rem] glass border-[hsl(var(--glass-border))]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="rounded-lg">
                <Pin className="h-4 w-4 mr-2" />
                Épingler
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="rounded-lg">
                <Star className="h-4 w-4 mr-2" />
                Favoris
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }} className="rounded-lg">
                <Edit3 className="h-4 w-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="rounded-lg">
                <Archive className="h-4 w-4 mr-2" />
                Archiver
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};