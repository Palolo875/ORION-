import { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  ChevronDown,
  ChevronRight,
  Bot,
  User
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
}

export const Sidebar = ({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose
}: SidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isTodayOpen, setIsTodayOpen] = useState(true);
  const [isPreviousOpen, setIsPreviousOpen] = useState(false);

  const today = new Date();
  const todayConversations = conversations.filter(conv => {
    const convDate = new Date(conv.timestamp);
    return convDate.toDateString() === today.toDateString();
  });
  
  const previousConversations = conversations.filter(conv => {
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
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-80 z-50 glass border-r border-[hsl(var(--glass-border))] lg:relative lg:z-auto">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-[hsl(var(--glass-border))]">
            <Button
              onClick={onNewConversation}
              className="w-full justify-start gap-2 h-10 glass-hover rounded-xl"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">Nouvelle conversation</span>
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-2">
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
            </div>
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
        "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent/50"
      )}
      onClick={!isEditing ? onSelect : undefined}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      
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
          <p className="text-sm font-medium truncate">
            {conversation.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.lastMessage}
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
                className="h-6 w-6 hover:bg-accent/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
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