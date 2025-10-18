import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const ConversationSidebar = ({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ConversationSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  };

  const groupedConversations = conversations.reduce((groups, conv) => {
    const now = new Date();
    const diff = now.getTime() - conv.timestamp.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    let group = "Plus ancien";
    if (days === 0) group = "Aujourd'hui";
    else if (days === 1) group = "Hier";
    else if (days < 7) group = "7 derniers jours";
    else if (days < 30) group = "30 derniers jours";

    if (!groups[group]) groups[group] = [];
    groups[group].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  const SidebarContent = () => (
    <div className="flex flex-col h-full glass border-r border-[hsl(var(--glass-border))]">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <Button
          onClick={() => {
            onNewConversation();
            setIsOpen(false);
          }}
          className="w-full justify-start gap-2 rounded-xl sm:rounded-2xl h-10 sm:h-11"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base font-medium">Nouvelle conversation</span>
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2 sm:px-3">
        <div className="space-y-6 py-4">
          {Object.entries(groupedConversations).map(([group, convs]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                {group}
              </h3>
              <div className="space-y-1">
                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onSelectConversation(conv.id);
                        setIsOpen(false);
                      }}
                      className={`w-full justify-start gap-2 rounded-lg sm:rounded-xl h-auto py-2.5 px-3 text-left ${
                        currentConversationId === conv.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.preview}
                        </p>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3.5 sm:top-4 left-3 sm:left-4 z-40 rounded-full h-8 w-8 sm:h-10 sm:w-10"
      >
        {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-80 z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 xl:w-80 h-full">
        <SidebarContent />
      </div>
    </>
  );
};
